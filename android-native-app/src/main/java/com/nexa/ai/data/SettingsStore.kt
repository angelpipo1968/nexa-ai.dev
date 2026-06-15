package com.nexa.ai.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.nexa.ai.viewmodel.AppLanguage
import com.nexa.ai.viewmodel.ThemeMode
import com.nexa.ai.viewmodel.VoiceType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsStore: DataStore<Preferences> by preferencesDataStore(name = "nexa_settings")

/**
 * Persists user preferences (theme, language, voice) across app restarts.
 */
class SettingsStore(private val context: Context) {

    private val KEY_THEME = stringPreferencesKey("theme_mode")
    private val KEY_LANGUAGE = stringPreferencesKey("language")
    private val KEY_VOICE = stringPreferencesKey("voice_type")
    private val KEY_ACCENT_COLOR = stringPreferencesKey("accent_color")
    private val KEY_GROQ_API_KEY = stringPreferencesKey("groq_api_key")
    private val KEY_USE_LOCAL_LLM = booleanPreferencesKey("use_local_llm")
    private val KEY_ALLOW_SYNC = booleanPreferencesKey("allow_sync")
    private val KEY_MAX_TOKENS = intPreferencesKey("max_tokens")

    val themeMode: Flow<ThemeMode> = context.settingsStore.data.map { prefs ->
        try {
            ThemeMode.valueOf(prefs[KEY_THEME] ?: ThemeMode.DARK.name)
        } catch (_: Exception) {
            ThemeMode.DARK
        }
    }

    val language: Flow<AppLanguage> = context.settingsStore.data.map { prefs ->
        try {
            AppLanguage.valueOf(prefs[KEY_LANGUAGE] ?: AppLanguage.SPANISH.name)
        } catch (_: Exception) {
            AppLanguage.SPANISH
        }
    }

    val voiceType: Flow<VoiceType> = context.settingsStore.data.map { prefs ->
        try {
            VoiceType.valueOf(prefs[KEY_VOICE] ?: VoiceType.FEMALE_1.name)
        } catch (_: Exception) {
            VoiceType.FEMALE_1
        }
    }

    val accentColor: Flow<Long> = context.settingsStore.data.map { prefs ->
        prefs[KEY_ACCENT_COLOR]?.toLongOrNull() ?: 0L
    }

    val groqApiKey: Flow<String> = context.settingsStore.data.map { prefs ->
        prefs[KEY_GROQ_API_KEY] ?: ""
    }

    val useLocalLLM: Flow<Boolean> = context.settingsStore.data.map { prefs ->
        prefs[KEY_USE_LOCAL_LLM] ?: false
    }

    val allowSync: Flow<Boolean> = context.settingsStore.data.map { prefs ->
        prefs[KEY_ALLOW_SYNC] ?: false
    }

    val maxTokens: Flow<Int> = context.settingsStore.data.map { prefs ->
        prefs[KEY_MAX_TOKENS] ?: 4096
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.settingsStore.edit { prefs ->
            prefs[KEY_THEME] = mode.name
        }
    }

    suspend fun setLanguage(lang: AppLanguage) {
        context.settingsStore.edit { prefs ->
            prefs[KEY_LANGUAGE] = lang.name
        }
    }

    suspend fun setVoiceType(type: VoiceType) {
        context.settingsStore.edit { prefs ->
            prefs[KEY_VOICE] = type.name
        }
    }

    suspend fun setAccentColor(color: Long) {
        context.settingsStore.edit { prefs ->
            prefs[KEY_ACCENT_COLOR] = color.toString()
        }
    }

    suspend fun setGroqApiKey(key: String) {
        context.settingsStore.edit { prefs ->
            prefs[KEY_GROQ_API_KEY] = key
        }
    }

    suspend fun deleteGroqApiKey() {
        context.settingsStore.edit { prefs ->
            prefs.remove(KEY_GROQ_API_KEY)
        }
    }

    suspend fun setUseLocalLLM(use: Boolean) {
        context.settingsStore.edit { prefs ->
            prefs[KEY_USE_LOCAL_LLM] = use
        }
    }

    suspend fun setAllowSync(allow: Boolean) {
        context.settingsStore.edit { prefs ->
            prefs[KEY_ALLOW_SYNC] = allow
        }
    }

    suspend fun setMaxTokens(tokens: Int) {
        context.settingsStore.edit { prefs ->
            prefs[KEY_MAX_TOKENS] = tokens
        }
    }
}
