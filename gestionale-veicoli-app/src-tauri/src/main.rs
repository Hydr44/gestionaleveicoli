#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Utc;
use dotenvy::dotenv;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Deserialize)]
struct CreateUserPayload {
    username: String,
    password: String,
    display_name: Option<String>,
    role: String,
}

#[derive(Debug, Deserialize)]
struct UpdateUserPayload {
    id: String,
    display_name: Option<String>,
    role: String,
    password: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DeleteUserPayload {
    id: String,
}

#[derive(Debug, Serialize)]
struct SupabaseCreateUserRequest<'a> {
    email: &'a str,
    password: &'a str,
    email_confirm: bool,
    user_metadata: SupabaseUserMetadata<'a>,
}

#[derive(Debug, Serialize)]
struct SupabaseUserMetadata<'a> {
    display_name: Option<&'a str>,
}

#[derive(Debug, Deserialize)]
struct SupabaseCreateUserResponse {
    user: Option<SupabaseUser>,
}

#[derive(Debug, Deserialize)]
struct SupabaseUser {
    id: String,
}

#[derive(Debug, Deserialize)]
struct SupabaseErrorResponse {
    error: Option<String>,
    error_description: Option<String>,
    msg: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SupabaseAdminUsersResponse {
    users: Vec<SupabaseUser>,
}

async fn fetch_user_id_by_email(
    client: &reqwest::Client,
    supabase_url: &str,
    service_role: &str,
    email: &str,
) -> Result<Option<String>, String> {
    let url = format!(
        "{}/auth/v1/admin/users?email=eq.{}",
        supabase_url, email
    );
    let res = client
        .get(&url)
        .header("apikey", service_role)
        .header("Authorization", format!("Bearer {}", service_role))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Errore chiamando admin list users: {}", e))?;

    if !res.status().is_success() {
        return Err(format!(
            "Supabase ha restituito {} durante la ricerca utente per email.",
            res.status()
        ));
    }

    let body = res
        .json::<SupabaseAdminUsersResponse>()
        .await
        .map_err(|e| format!("Errore parsing risposta utenti: {}", e))?;

    Ok(body.users.first().map(|u| u.id.clone()))
}

#[tauri::command]
async fn create_supabase_user(payload: CreateUserPayload) -> Result<(), String> {
    let supabase_url =
        env::var("SUPABASE_URL").or_else(|_| env::var("VITE_SUPABASE_URL")).map_err(|_| {
            "Variabile d’ambiente SUPABASE_URL non configurata. Inseriscila nel file .env".to_string()
        })?;
    let service_role =
        env::var("SUPABASE_SERVICE_ROLE_KEY").map_err(|_| {
            "Variabile d’ambiente SUPABASE_SERVICE_ROLE_KEY non configurata.".to_string()
        })?;

    let email = if payload.username.contains('@') {
        payload.username.to_lowercase()
    } else {
        format!("{}@app.local", payload.username.to_lowercase())
    };

    let client = reqwest::Client::new();

    let create_request = SupabaseCreateUserRequest {
        email: &email,
        password: &payload.password,
        email_confirm: true,
        user_metadata: SupabaseUserMetadata {
            display_name: payload.display_name.as_deref(),
        },
    };

    let admin_url = format!("{}/auth/v1/admin/users", supabase_url);
    let response = client
        .post(&admin_url)
        .header("apikey", &service_role)
        .header("Authorization", format!("Bearer {}", service_role))
        .json(&create_request)
        .send()
        .await
        .map_err(|e| format!("Errore richiesta Supabase: {}", e))?;

    let mut user_id: Option<String> = None;

    if response.status().is_success() {
        let body = response
            .json::<SupabaseCreateUserResponse>()
            .await
            .map_err(|e| format!("Errore lettura risposta Supabase: {}", e))?;
        user_id = match body.user {
            Some(user) => Some(user.id),
            None => fetch_user_id_by_email(&client, &supabase_url, &service_role, &email).await?,
        };
    } else if response.status() == StatusCode::UNPROCESSABLE_ENTITY
        || response.status() == StatusCode::BAD_REQUEST
        || response.status() == StatusCode::CONFLICT
    {
        // Utente potrebbe già esistere, recupero ID
        let error_body = response
            .json::<SupabaseErrorResponse>()
            .await
            .unwrap_or(SupabaseErrorResponse {
                error: None,
                error_description: None,
                msg: None,
            });
        if let Some(msg) = error_body
            .error_description
            .or(error_body.error)
            .or(error_body.msg)
        {
            if !msg.to_lowercase().contains("already") {
                return Err(format!("Supabase ha risposto con errore: {}", msg));
            }
        }
        user_id = fetch_user_id_by_email(&client, &supabase_url, &service_role, &email).await?;

        if user_id.is_none() {
            return Err("Utente già presente ma impossibile recuperare l'ID relativo.".to_string());
        }
    } else {
        return Err(format!(
            "Errore Supabase ({})",
            response.status()
        ));
    }

    let user_id = user_id.ok_or_else(|| "Impossibile ottenere l'ID utente da Supabase.".to_string())?;
    let display_name = payload
        .display_name
        .clone()
        .unwrap_or_else(|| payload.username.clone());

    let patch_url = format!(
        "{}/rest/v1/profiles?id=eq.{}",
        supabase_url, user_id
    );
    let now = Utc::now().to_rfc3339();
    let patch_body = serde_json::json!({
        "username": payload.username,
        "display_name": display_name,
        "role": payload.role,
        "updated_at": now,
        "updated_by": user_id
    });

    let patch_res = client
        .patch(&patch_url)
        .header("apikey", &service_role)
        .header("Authorization", format!("Bearer {}", service_role))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=minimal")
        .json(&patch_body)
        .send()
        .await
        .map_err(|e| format!("Errore aggiornando il profilo: {}", e))?;

    if !patch_res.status().is_success() {
        return Err(format!(
            "Supabase ha restituito {} durante l'aggiornamento profilo",
            patch_res.status()
        ));
    }

    Ok(())
}

#[tauri::command]
async fn update_supabase_user(payload: UpdateUserPayload) -> Result<(), String> {
    let supabase_url =
        env::var("SUPABASE_URL").or_else(|_| env::var("VITE_SUPABASE_URL")).map_err(|_| {
            "Variabile d’ambiente SUPABASE_URL non configurata. Inseriscila nel file .env".to_string()
        })?;
    let service_role =
        env::var("SUPABASE_SERVICE_ROLE_KEY").map_err(|_| {
            "Variabile d’ambiente SUPABASE_SERVICE_ROLE_KEY non configurata.".to_string()
        })?;

    let client = reqwest::Client::new();

    if payload.password.as_ref().map(|p| !p.trim().is_empty()).unwrap_or(false)
        || payload.display_name.as_ref().map(|d| !d.trim().is_empty()).unwrap_or(false)
    {
        let mut admin_body = serde_json::Map::new();
        if let Some(password) = payload.password.as_ref().map(|p| p.trim()).filter(|p| !p.is_empty()) {
            admin_body.insert("password".to_string(), serde_json::Value::String(password.to_string()));
        }
        if let Some(display_name) = payload.display_name.as_ref().map(|d| d.trim()).filter(|d| !d.is_empty()) {
            admin_body.insert(
                "user_metadata".to_string(),
                serde_json::json!({ "display_name": display_name }),
            );
        }
        if !admin_body.is_empty() {
            let admin_url = format!("{}/auth/v1/admin/users/{}", supabase_url, payload.id);
            let res = client
                .patch(&admin_url)
                .header("apikey", &service_role)
                .header("Authorization", format!("Bearer {}", service_role))
                .header("Content-Type", "application/json")
                .json(&admin_body)
                .send()
                .await
                .map_err(|e| format!("Errore aggiornando utente (admin): {}", e))?;

            if !res.status().is_success() {
                return Err(format!(
                    "Supabase ha restituito {} durante l'aggiornamento admin.",
                    res.status()
                ));
            }
        }
    }

    let now = Utc::now().to_rfc3339();
    let patch_url = format!(
        "{}/rest/v1/profiles?id=eq.{}",
        supabase_url, payload.id
    );
    let patch_body = serde_json::json!({
        "display_name": payload.display_name.clone(),
        "role": payload.role,
        "updated_at": now,
        "updated_by": payload.id
    });

    let patch_res = client
        .patch(&patch_url)
        .header("apikey", &service_role)
        .header("Authorization", format!("Bearer {}", service_role))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=minimal")
        .json(&patch_body)
        .send()
        .await
        .map_err(|e| format!("Errore aggiornando il profilo: {}", e))?;

    if !patch_res.status().is_success() {
        return Err(format!(
            "Supabase ha restituito {} durante l'aggiornamento profilo",
            patch_res.status()
        ));
    }

    Ok(())
}

#[tauri::command]
async fn delete_supabase_user(payload: DeleteUserPayload) -> Result<(), String> {
    let supabase_url =
        env::var("SUPABASE_URL").or_else(|_| env::var("VITE_SUPABASE_URL")).map_err(|_| {
            "Variabile d’ambiente SUPABASE_URL non configurata. Inseriscila nel file .env".to_string()
        })?;
    let service_role =
        env::var("SUPABASE_SERVICE_ROLE_KEY").map_err(|_| {
            "Variabile d’ambiente SUPABASE_SERVICE_ROLE_KEY non configurata.".to_string()
        })?;

    let client = reqwest::Client::new();

    let admin_url = format!("{}/auth/v1/admin/users/{}", supabase_url, payload.id);
    let admin_res = client
        .delete(&admin_url)
        .header("apikey", &service_role)
        .header("Authorization", format!("Bearer {}", service_role))
        .send()
        .await
        .map_err(|e| format!("Errore eliminando utente (admin): {}", e))?;

    if !admin_res.status().is_success() && admin_res.status() != StatusCode::NOT_FOUND {
        return Err(format!(
            "Supabase ha restituito {} durante l'eliminazione admin",
            admin_res.status()
        ));
    }

    let delete_profile_url = format!(
        "{}/rest/v1/profiles?id=eq.{}",
        supabase_url, payload.id
    );
    let profile_res = client
        .delete(&delete_profile_url)
        .header("apikey", &service_role)
        .header("Authorization", format!("Bearer {}", service_role))
        .header("Prefer", "return=minimal")
        .send()
        .await
        .map_err(|e| format!("Errore eliminando il profilo: {}", e))?;

    if !profile_res.status().is_success() && profile_res.status() != StatusCode::NOT_FOUND {
        return Err(format!(
            "Supabase ha restituito {} durante l'eliminazione profilo",
            profile_res.status()
        ));
    }

    Ok(())
}

#[tauri::command]
fn open_devtools(window: tauri::WebviewWindow) {
    #[cfg(debug_assertions)]
    {
        window.open_devtools();
        window.close_devtools();
        window.open_devtools();
    }
}

fn main() {
    dotenv().ok();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_supabase_user,
            update_supabase_user,
            delete_supabase_user,
            open_devtools
        ])
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio dell'app Tauri");
}

