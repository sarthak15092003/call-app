package com.example.smartcallagent

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.CallLog
import android.telephony.TelephonyManager
import android.util.Log
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
        private var lastState = TelephonyManager.EXTRA_STATE_IDLE
        private var isCallInProgress = false
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        Log.d(TAG, "Phone State changed from $lastState to $state")

        if (state == TelephonyManager.EXTRA_STATE_OFFHOOK) {
            isCallInProgress = true
        } else if (state == TelephonyManager.EXTRA_STATE_IDLE && isCallInProgress) {
            isCallInProgress = false
            Log.d(TAG, "Outbound call completed! Querying Android CallLog...")

            // Delay 1.5s so Android OS flushes CallLog.Calls
            CoroutineScope(Dispatchers.IO).launch {
                delay(1500)
                processLastCall(context)
            }
        }

        lastState = state
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

                    val callTypeStr = when (type) {
                        CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                        CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                        CallLog.Calls.MISSED_TYPE -> "MISSED"
                        CallLog.Calls.REJECTED_TYPE -> "REJECTED"
                        else -> "OUTGOING"
                    }

                    val dateIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date(dateLong))

                    Log.i(TAG, "Extracted Call from SIM: Number=$number, Duration=${durationSeconds}s, Type=$callTypeStr")

                    // Retrieve CRM server configuration from SharedPreferences
                    val prefs = context.getSharedPreferences("smartcall_prefs", Context.MODE_PRIVATE)
                    val serverUrl = prefs.getString("server_url", "https://your-crm.vercel.app")?.trimEnd('/')
                    val agentId = prefs.getString("agent_id", "usr_agent_1") ?: "usr_agent_1"
                    val agentName = prefs.getString("agent_name", "Mobile Agent") ?: "Mobile Agent"

                    sendCallToServer(
                        serverUrl = "$serverUrl/api/telephony/mobile-sync",
                        agentId = agentId,
                        agentName = agentName,
                        customerNumber = number,
                        duration = durationSeconds,
                        callType = callTypeStr,
                        timestamp = dateIso
                    )
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
    ) {
        try {
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
        } catch (e: Exception) {
            Log.e(TAG, "Failed to upload call to CRM server: ${e.message}", e)
        }
    }
}

