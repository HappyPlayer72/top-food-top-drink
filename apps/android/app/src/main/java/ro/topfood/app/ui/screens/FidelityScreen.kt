package ro.topfood.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ro.topfood.app.data.model.LoyaltyProgram
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.ui.MainUiState
import ro.topfood.app.ui.components.CarouStrip
import ro.topfood.app.ui.components.QrCodeCanvas
import ro.topfood.app.ui.theme.LocalTopFoodColors

private val ICON_LABELS = listOf(
    "soup" to "Ciorbă",
    "coffee" to "Cafea",
    "croissant" to "Patiserie",
    "pizza" to "Pizza",
    "beer" to "Bere",
    "wine" to "Vin",
    "heart" to "Inimă",
    "cat" to "Pisică",
)

@Composable
fun FidelityScreen(
    state: MainUiState,
    onStampProgram: (programId: String, qrCode: String?) -> Unit,
    onCreatePersonalCard: (venueName: String, reward: String, stampsRequired: Int, iconId: String) -> Unit,
    onOpenLogin: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    val isDrink = state.vertical == Vertical.DRINK
    var showCreateDialog by remember { mutableStateOf(false) }
    var showScanDialog by remember { mutableStateOf(false) }
    var manualQrInput by remember { mutableStateOf("") }

    LazyColumn(
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
    ) {
        item {
            Column(
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = "FIDELITATE QR · TIMIȘOARA",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.primary,
                )
                Text(
                    text = "Cardurile tale de ștampile",
                    style = MaterialTheme.typography.displaySmall,
                    color = colors.onBackground,
                )
                Text(
                    text = "Strângi ștampile la localurile participante sau creezi un card personal pentru orice loc favorit.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceMuted,
                )
            }
        }

        if (state.currentUser == null) {
            item {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = colors.surface,
                    border = BorderStroke(1.dp, colors.border),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Icon(Icons.Filled.Lock, contentDescription = null, tint = colors.primary)
                        Text(
                            text = "Conectează-te ca să salvezi ștampilele și recompensele",
                            style = MaterialTheme.typography.titleLarge,
                            color = colors.onBackground,
                        )
                        Text(
                            text = "Poți intra într-un singur click cu contul demo de localnic (Andreea M.).",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onSurfaceMuted,
                        )
                        Button(
                            onClick = onOpenLogin,
                            colors = ButtonDefaults.buttonColors(containerColor = colors.primary, contentColor = colors.onPrimary),
                        ) {
                            Text("Conectează-te / Cont demo")
                        }
                    }
                }
            }
        } else {
            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    Button(
                        onClick = { showScanDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primary, contentColor = colors.onPrimary),
                        modifier = Modifier.weight(1f),
                    ) {
                        Text("Scanează cod QR")
                    }
                    OutlinedButton(
                        onClick = { showCreateDialog = true },
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Card personal")
                    }
                }
            }

            items(state.loyaltyPrograms, key = { it.id }) { program ->
                LoyaltyCardItem(
                    program = program,
                    onStamp = { onStampProgram(program.id, null) },
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
            }
        }
    }

    if (showScanDialog) {
        AlertDialog(
            onDismissRequest = { showScanDialog = false },
            title = { Text("Introdu codul QR de la casă") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Introdu codul rotativ afișat la local (format programId.window.sig) sau folosește ștampila direct pe card.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    OutlinedTextField(
                        value = manualQrInput,
                        onValueChange = { manualQrInput = it },
                        label = { Text("Cod QR") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val trimmed = manualQrInput.trim()
                        if (trimmed.isNotBlank()) {
                            onStampProgram(trimmed.substringBefore('.'), trimmed)
                        }
                        manualQrInput = ""
                        showScanDialog = false
                    }
                ) { Text("Validează ștampila") }
            },
            dismissButton = {
                TextButton(onClick = { showScanDialog = false }) { Text("Anulează") }
            },
        )
    }

    if (showCreateDialog) {
        CreatePersonalCardDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { venue, reward, req, icon ->
                onCreatePersonalCard(venue, reward, req, icon)
                showCreateDialog = false
            },
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LoyaltyCardItem(
    program: LoyaltyProgram,
    onStamp: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    val accent = runCatching {
        Color(android.graphics.Color.parseColor(program.accentColor))
    }.getOrElse { colors.primary }
    val readyToRedeem = program.stampsCollected >= program.stampsRequired

    Surface(
        shape = RoundedCornerShape(10.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, accent.copy(alpha = 0.45f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.padding(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                QrCodeCanvas(
                    seed = program.qrSeed.ifBlank { program.id },
                    fgColor = accent,
                    bgColor = Color.White,
                    modifier = Modifier.size(66.dp),
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = program.venueName,
                        style = MaterialTheme.typography.titleLarge,
                        color = colors.onBackground,
                    )
                    Text(
                        text = program.neighborhood,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurfaceMuted,
                    )
                    Text(
                        text = "Recompensă: ${program.rewardTitle}",
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.onBackground,
                    )
                }
            }

            // Stamp Grid
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                for (i in 1..program.stampsRequired) {
                    val stamped = i <= program.stampsCollected
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(if (stamped) accent else colors.surfaceElevated)
                            .border(1.dp, if (stamped) accent else colors.border, CircleShape)
                    ) {
                        if (stamped) {
                            Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        } else {
                            Text("$i", style = MaterialTheme.typography.labelSmall, color = colors.onSurfaceMuted)
                        }
                    }
                }
            }

            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "${program.stampsCollected}/${program.stampsRequired} ștampile · ${program.redeemedCount} premii folosite",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceMuted,
                )
                Button(
                    onClick = onStamp,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (readyToRedeem) colors.warning else accent,
                        contentColor = if (readyToRedeem) colors.onWarning else Color.White,
                    ),
                ) {
                    if (readyToRedeem) {
                        Icon(Icons.Filled.Star, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Folosește premiul")
                    } else {
                        Text("+1 Ștampilă")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreatePersonalCardDialog(
    onDismiss: () -> Unit,
    onCreate: (String, String, Int, String) -> Unit,
) {
    var venueName by remember { mutableStateOf("") }
    var rewardTitle by remember { mutableStateOf("") }
    var stampsRequired by remember { mutableIntStateOf(6) }
    var selectedIcon by remember { mutableStateOf("coffee") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Card personal de fidelitate") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = venueName,
                    onValueChange = { venueName = it },
                    label = { Text("Nume local (ex. Cafeneaua din colț)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = rewardTitle,
                    onValueChange = { rewardTitle = it },
                    label = { Text("Recompensă (ex. O cafea gratuită)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(5, 6, 8, 10).forEach { n ->
                        FilterChip(
                            selected = stampsRequired == n,
                            onClick = { stampsRequired = n },
                            label = { Text("$n") },
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ICON_LABELS.take(4).forEach { (id, label) ->
                        FilterChip(
                            selected = selectedIcon == id,
                            onClick = { selectedIcon = id },
                            label = { Text(label, style = MaterialTheme.typography.bodySmall) },
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onCreate(venueName, rewardTitle, stampsRequired, selectedIcon) },
                enabled = venueName.trim().length >= 2 && rewardTitle.trim().length >= 2,
            ) {
                Text("Creează cardul")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Renunță") }
        },
    )
}
