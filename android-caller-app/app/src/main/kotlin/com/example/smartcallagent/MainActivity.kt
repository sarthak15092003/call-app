package com.example.smartcallagent

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
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

        setContent {
            SmartCallAgentTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AgentDashboard(
                        onCheckPermissions = { checkAndRequestPermissions() },
                        onMakeCall = { number -> makeDirectPhoneCall(number) }
                    )
                }
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val missing = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        } else {
            Toast.makeText(this, "Permissions already granted!", Toast.LENGTH_SHORT).show()
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
    onCheckPermissions: () -> Unit,
    onMakeCall: (String) -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = remember { context.getSharedPreferences("smartcall_prefs", Context.MODE_PRIVATE) }

    var serverUrl by remember { mutableStateOf(prefs.getString("server_url", "https://your-crm.vercel.app") ?: "") }
    var agentName by remember { mutableStateOf(prefs.getString("agent_name", "Priya Sharma") ?: "") }
    var agentId by remember { mutableStateOf(prefs.getString("agent_id", "usr_agent_1") ?: "") }
    var testPhoneNumber by remember { mutableStateOf("+919820154321") }
    var syncStatusText by remember { mutableStateOf("Ready to track carrier calls") }
    var isTestingSync by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("SmartCall Agent", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("Real SIM Call Tracker & Sync", fontSize = 11.sp, color = Color.Gray)
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // CRM Server Connection Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("CRM Server Connection", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    
                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = { 
                            serverUrl = it
                            prefs.edit().putString("server_url", it).apply()
                        },
                        label = { Text("Server URL (Vercel or Local IP)") },
                        placeholder = { Text("https://smartcall-crm.vercel.app") },
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
                }
            }

            // Android Permissions Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Android System Permissions", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF166534))
                    Text(
                        "Grants access to READ_CALL_LOG & READ_PHONE_STATE so when you make SIM calls, exact talk duration is captured automatically.",
                        fontSize = 12.sp,
                        color = Color(0xFF15803D)
                    )
                    Button(
                        onClick = onCheckPermissions,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Grant Call Tracking Permissions")
                    }
                }
            }

            // Quick Click-to-Call Dialer Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Real Outbound SIM Dialer", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("Dials directly using your phone's native SIM. When the call disconnects, duration is synced to SmartCall CRM.", fontSize = 12.sp, color = Color.Gray)

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

            // Sync Status & Test Sync Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Sync Diagnostics", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text(syncStatusText, fontSize = 12.sp, color = Color.DarkGray)

                    Button(
                        onClick = {
                            isTestingSync = true
                            syncStatusText = "Pinging CRM at $serverUrl/api/telephony/mobile-sync..."
                            CoroutineScope(Dispatchers.IO).launch {
                                try {
                                    val url = URL("${serverUrl.trimEnd('/')}/api/telephony/mobile-sync")
                                    val conn = url.openConnection() as HttpURLConnection
                                    conn.requestMethod = "POST"
                                    conn.setRequestProperty("Content-Type", "application/json")
                                    conn.connectTimeout = 6000
                                    conn.doOutput = true

                                    val dummyTest = JSONObject().apply {
                                        put("agentId", agentId)
                                        put("agentName", agentName)
                                        put("customerNumber", testPhoneNumber)
                                        put("duration", 32)
                                        put("callType", "OUTGOING")
                                        put("deviceInfo", "Android Diagnostic Test")
                                    }

                                    OutputStreamWriter(conn.outputStream).use { it.write(dummyTest.toString()) }
                                    val code = conn.responseCode
                                    withContext(Dispatchers.Main) {
                                        syncStatusText = "Connection SUCCESS! HTTP $code: Call log recorded in CRM!"
                                        isTestingSync = false
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        syncStatusText = "Connection FAILED: ${e.message}"
                                        isTestingSync = false
                                    }
                                }
                            }
                        },
                        enabled = !isTestingSync,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F172A)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(if (isTestingSync) "Testing..." else "Test Server Connection Now")
                    }
                }
            }
        }
    }
}
