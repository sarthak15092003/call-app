package com.example.smartcallagent

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.CallLog
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.smartcallagent.ui.theme.SmartCallAgentTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {

    private val requiredPermissions = arrayOf(
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.READ_CALL_LOG,
        Manifest.permission.CALL_PHONE
    )

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val allGranted = results.values.all { it }
        if (allGranted) {
            Toast.makeText(this, "All call tracking permissions granted!", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Permissions required to track real call durations", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Auto-request permissions on startup if not already granted
        checkAndRequestPermissions(silent = true)

        setContent {
            SmartCallAgentTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AgentDashboard(
                        hasPermissions = hasAllPermissions(),
                        onRequestPermissions = { checkAndRequestPermissions(silent = false) },
                        onMakeCall = { number -> makeDirectPhoneCall(number) }
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Re-compose to refresh permission state when coming back from system settings
    }

    private fun hasAllPermissions(): Boolean {
        return requiredPermissions.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun checkAndRequestPermissions(silent: Boolean = false) {
        val missing = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        } else if (!silent) {
            Toast.makeText(this, "All tracking permissions are already active!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun makeDirectPhoneCall(phoneNumber: String) {
        val clean = phoneNumber.trim()
        if (clean.isBlank()) {
            Toast.makeText(this, "Please enter a valid phone number", Toast.LENGTH_SHORT).show()
            return
        }
        val intent = Intent(Intent.ACTION_CALL).apply {
            data = Uri.parse("tel:$clean")
        }
        try {
            startActivity(intent)
        } catch (e: SecurityException) {
            Toast.makeText(this, "Call permission not granted. Please grant permissions first.", Toast.LENGTH_SHORT).show()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentDashboard(
    hasPermissions: Boolean,
    onRequestPermissions: () -> Unit,
    onMakeCall: (String) -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = remember { context.getSharedPreferences("smartcall_prefs", Context.MODE_PRIVATE) }

    val defaultUrl = "https://call-app-aouj.vercel.app"
    var serverUrl by remember { 
        val saved = prefs.getString("server_url", null)
        mutableStateOf(if (saved.isNullOrBlank() || saved.contains("your-crm")) defaultUrl else saved)
    }
    var agentName by remember { mutableStateOf(prefs.getString("agent_name", "Rajesh Kumar") ?: "Rajesh Kumar") }
    var agentId by remember { mutableStateOf(prefs.getString("agent_id", "usr_agent_1") ?: "usr_agent_1") }
    var testPhoneNumber by remember { mutableStateOf("+918851617347") }
    var syncStatusText by remember { mutableStateOf("Ready to capture real SIM calls") }
    var lastDetectedCallText by remember { mutableStateOf("No call detected yet") }
    var isOperating by remember { mutableStateOf(false) }

    // Save initial correct server_url
    LaunchedEffect(Unit) {
        prefs.edit().putString("server_url", serverUrl).apply()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("SmartCall Agent", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("Carrier SIM Sync for call-app-aouj.vercel.app", fontSize = 11.sp, color = Color.Gray)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Permission Status Card
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (hasPermissions) Color(0xFFDCFCE7) else Color(0xFFFEE2E2)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (hasPermissions) "✓ Call Tracking Active" else "⚠ Permissions Needed",
                            fontWeight = FontWeight.Bold,
                            color = if (hasPermissions) Color(0xFF15803D) else Color(0xFFB91C1C)
                        )
                        Text(
                            text = if (hasPermissions) "READ_CALL_LOG and PHONE_STATE enabled." else "Tap to allow call log & phone tracking",
                            fontSize = 11.sp,
                            color = if (hasPermissions) Color(0xFF166534) else Color(0xFF991B1B)
                        )
                    }
                    if (!hasPermissions) {
                        Button(
                            onClick = onRequestPermissions,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("Grant", fontSize = 12.sp)
                        }
                    }
                }
            }

            // Server Connection Card
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("CRM Cloud Connection", fontWeight = FontWeight.Bold, fontSize = 14.sp)

                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = { 
                            serverUrl = it
                            prefs.edit().putString("server_url", it.trim()).apply()
                        },
                        label = { Text("Server URL") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = agentName,
                            onValueChange = {
                                agentName = it
                                prefs.edit().putString("agent_name", it).apply()
                            },
                            label = { Text("Agent Name") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = agentId,
                            onValueChange = {
                                agentId = it
                                prefs.edit().putString("agent_id", it).apply()
                            },
                            label = { Text("Agent ID") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                    }

                    // Ping CRM Button
                    OutlinedButton(
                        onClick = {
                            isOperating = true
                            syncStatusText = "Pinging CRM server..."
                            CoroutineScope(Dispatchers.IO).launch {
                                val urlStr = "${serverUrl.trimEnd('/')}/api/telephony/mobile-sync"
                                val (status, msg) = try {
                                    val conn = URL(urlStr).openConnection() as HttpURLConnection
                                    conn.requestMethod = "GET"
                                    conn.connectTimeout = 6000
                                    conn.readTimeout = 6000
                                    val code = conn.responseCode
                                    conn.disconnect()
                                    Pair(code in 200..299, "Connected! Server online (HTTP $code)")
                                } catch (e: Exception) {
                                    Pair(false, "Connection failed: ${e.message}")
                                }
                                withContext(Dispatchers.Main) {
                                    isOperating = false
                                    syncStatusText = msg
                                    Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Test Connection to CRM")
                    }
                }
            }

            // Sync Diagnostics Card
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Live Call Sync Actions", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text(syncStatusText, fontSize = 12.sp, color = Color(0xFF334155))

                    // 1. Sync Last Real Call From Android CallLog Button
                    Button(
                        onClick = {
                            isOperating = true
                            syncStatusText = "Reading Android CallLog..."
                            CoroutineScope(Dispatchers.IO).launch {
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
                                            val durationSec = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))
                                            val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                                            val dateLong = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DATE))
                                            val dateIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date(dateLong))

                                            val typeStr = when (type) {
                                                CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                                                CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                                                CallLog.Calls.MISSED_TYPE -> "MISSED"
                                                else -> "OUTGOING"
                                            }

                                            withContext(Dispatchers.Main) {
                                                lastDetectedCallText = "Found: $number | Duration: ${durationSec}s | Type: $typeStr"
                                            }

                                            // Push to server
                                            val endpoint = "${serverUrl.trimEnd('/')}/api/telephony/mobile-sync"
                                            val conn = URL(endpoint).openConnection() as HttpURLConnection
                                            conn.requestMethod = "POST"
                                            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                                            conn.connectTimeout = 8000
                                            conn.doOutput = true

                                            val payload = JSONObject().apply {
                                                put("agentId", agentId)
                                                put("agentName", agentName)
                                                put("customerNumber", number)
                                                put("duration", durationSec)
                                                put("callType", typeStr)
                                                put("timestamp", dateIso)
                                                put("deviceInfo", "Android Manual Push (${android.os.Build.MODEL})")
                                            }

                                            OutputStreamWriter(conn.outputStream).use { writer ->
                                                writer.write(payload.toString())
                                                writer.flush()
                                            }
                                            val code = conn.responseCode
                                            conn.disconnect()

                                            withContext(Dispatchers.Main) {
                                                isOperating = false
                                                if (code in 200..299) {
                                                    syncStatusText = "✓ Synced last call: $number (${durationSec}s) -> CRM Updated!"
                                                    Toast.makeText(context, "Call synced to CRM successfully!", Toast.LENGTH_LONG).show()
                                                } else {
                                                    syncStatusText = "Failed to sync (HTTP $code)"
                                                }
                                            }
                                        } else {
                                            withContext(Dispatchers.Main) {
                                                isOperating = false
                                                syncStatusText = "No calls found in Android CallLog"
                                            }
                                        }
                                    } ?: run {
                                        withContext(Dispatchers.Main) {
                                            isOperating = false
                                            syncStatusText = "Permission denied reading CallLog"
                                        }
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        isOperating = false
                                        syncStatusText = "Error: ${e.message}"
                                    }
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F766E)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Sync Last SIM Call to CRM Now", fontWeight = FontWeight.Bold)
                    }

                    // 2. Send 1-Click Test Call to verify Web Dashboard
                    OutlinedButton(
                        onClick = {
                            isOperating = true
                            syncStatusText = "Sending test call to CRM..."
                            CoroutineScope(Dispatchers.IO).launch {
                                try {
                                    val endpoint = "${serverUrl.trimEnd('/')}/api/telephony/mobile-sync"
                                    val conn = URL(endpoint).openConnection() as HttpURLConnection
                                    conn.requestMethod = "POST"
                                    conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                                    conn.connectTimeout = 8000
                                    conn.doOutput = true

                                    val payload = JSONObject().apply {
                                        put("agentId", agentId)
                                        put("agentName", agentName)
                                        put("customerNumber", testPhoneNumber)
                                        put("duration", 28)
                                        put("callType", "OUTGOING")
                                        put("timestamp", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date()))
                                        put("deviceInfo", "Android Diagnostic Test (${android.os.Build.MODEL})")
                                    }

                                    OutputStreamWriter(conn.outputStream).use { writer ->
                                        writer.write(payload.toString())
                                        writer.flush()
                                    }
                                    val code = conn.responseCode
                                    conn.disconnect()

                                    withContext(Dispatchers.Main) {
                                        isOperating = false
                                        if (code in 200..299) {
                                            syncStatusText = "✓ Test Call (28s) Synced! Check web dashboard now."
                                            Toast.makeText(context, "Test Call Sent! Check your CRM dashboard.", Toast.LENGTH_LONG).show()
                                        } else {
                                            syncStatusText = "Failed to send test call (HTTP $code)"
                                        }
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        isOperating = false
                                        syncStatusText = "Error: ${e.message}"
                                    }
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Send Instant Test Call (28s)")
                    }
                }
            }

            // SIM Dialer Card
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Real Outbound SIM Dialer", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Dials customer using your phone's carrier SIM. When the call ends, duration is synced automatically.", fontSize = 12.sp, color = Color.Gray)

                    OutlinedTextField(
                        value = testPhoneNumber,
                        onValueChange = { testPhoneNumber = it },
                        label = { Text("Customer Phone Number") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Button(
                        onClick = { onMakeCall(testPhoneNumber) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5))
                    ) {
                        Text("Dial Customer from SIM", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
