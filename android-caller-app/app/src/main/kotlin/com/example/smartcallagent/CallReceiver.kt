package com.example.smartcallagent

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.provider.CallLog
import android.telephony.TelephonyManager
import android.util.Log
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CallReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmartCallReceiver"
        const val DEFAULT_SERVER_URL = "https://call-app-aouj.vercel.app"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val prefs = context.getSharedPreferences("smartcall_prefs", Context.MODE_PRIVATE)
        val prevState = prefs.getString("last_phone_state", TelephonyManager.EXTRA_STATE_IDLE)
        prefs.edit().putString("last_phone_state", state).apply()

        Log.d(TAG, "Phone State changed from $prevState to $state")

        // Trigger processing whenever transitioning to IDLE (call finished or missed)
        if (state == TelephonyManager.EXTRA_STATE_IDLE) {
            Log.d(TAG, "Phone IDLE detected. Checking CallLog...")

            // Wait 1.5s then 3.5s to ensure Android flushes CallLog
            CoroutineScope(Dispatchers.IO).launch {
                delay(1500)
                processLastCall(context)
            }
        }
    }

    private fun processLastCall(context: Context) {
        try {
            val cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DATE
                ),
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    val number = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
                    val durationSeconds = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))
                    val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                    val dateLong = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DATE))

                    val prefs = context.getSharedPreferences("smartcall_prefs", Context.MODE_PRIVATE)
                    val lastSyncedDate = prefs.getLong("last_synced_call_date", 0L)

                    // Prevent duplicate syncing of the same call event
                    if (dateLong == lastSyncedDate) {
                        Log.d(TAG, "Call at $dateLong already synced. Skipping.")
                        return
                    }

                    // Only sync calls that occurred within the last 5 minutes
                    val ageMs = System.currentTimeMillis() - dateLong
                    if (ageMs > 5 * 60 * 1000) {
                        Log.d(TAG, "Latest call in CallLog is too old (${ageMs / 1000}s ago). Skipping.")
                        return
                    }

                    val callTypeStr = when (type) {
                        CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                        CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                        CallLog.Calls.MISSED_TYPE -> "MISSED"
                        CallLog.Calls.REJECTED_TYPE -> "REJECTED"
                        else -> "OUTGOING"
                    }

                    val dateIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date(dateLong))

                    Log.i(TAG, "Extracted Call from SIM: Number=$number, Duration=${durationSeconds}s, Type=$callTypeStr")

                    // Retrieve CRM server configuration
                    val serverUrl = prefs.getString("server_url", DEFAULT_SERVER_URL)?.trimEnd('/') ?: DEFAULT_SERVER_URL
                    val agentId = prefs.getString("agent_id", "usr_agent_1") ?: "usr_agent_1"
                    val agentName = prefs.getString("agent_name", "Mobile Agent") ?: "Mobile Agent"

                    val success = sendCallToServer(
                        serverUrl = "$serverUrl/api/telephony/mobile-sync",
                        agentId = agentId,
                        agentName = agentName,
                        customerNumber = number,
                        duration = durationSeconds,
                        callType = callTypeStr,
                        timestamp = dateIso
                    )

                    if (success) {
                        prefs.edit().putLong("last_synced_call_date", dateLong).apply()
                        Handler(Looper.getMainLooper()).post {
                            Toast.makeText(
                                context,
                                "SmartCall: Synced call to $number (${durationSeconds}s) to CRM!",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed reading CallLog: ${e.message}", e)
        }
    }

    private fun sendCallToServer(
        serverUrl: String,
        agentId: String,
        agentName: String,
        customerNumber: String,
        duration: Int,
        callType: String,
        timestamp: String
    ): Boolean {
        return try {
            val url = URL(serverUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conn.setRequestProperty("Accept", "application/json")
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("agentId", agentId)
                put("agentName", agentName)
                put("customerNumber", customerNumber)
                put("duration", duration)
                put("callType", callType)
                put("timestamp", timestamp)
                put("deviceInfo", "Android Native App (${android.os.Build.MODEL})")
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val responseCode = conn.responseCode
            Log.i(TAG, "Uploaded call to CRM ($serverUrl). HTTP Response Code: $responseCode")
            conn.disconnect()
            responseCode in 200..299
        } catch (e: Exception) {
            Log.e(TAG, "Failed to upload call to CRM server: ${e.message}", e)
            false
        }
    }
}
