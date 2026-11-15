package ro.topfood.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import ro.topfood.app.data.model.InterestSpec
import ro.topfood.app.data.model.Restaurant
import ro.topfood.app.data.model.UserAccount
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.ui.MainUiState
import ro.topfood.app.ui.components.CarouStrip
import ro.topfood.app.ui.components.InfluencerBadge
import ro.topfood.app.ui.components.LocalnicBadge
import ro.topfood.app.ui.components.ScoreBadge
import ro.topfood.app.ui.components.TuristBadge
import ro.topfood.app.ui.theme.LocalTopFoodColors

private enum class AuthTab(val label: String) {
    DEMO("Conturi demo"),
    LOGIN("Autentificare"),
    REGISTER("Cont nou"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountSheet(
    state: MainUiState,
    demoUsers: List<UserAccount>,
    onClose: () -> Unit,
    onLoginDemo: (String) -> Unit,
    onLoginCredentials: (String, String) -> Unit,
    onRegister: (name: String, email: String, password: String, interests: List<String>) -> Unit,
    onLogout: () -> Unit,
    onCheckInLocal: () -> Unit,
    onStartUniEmail: (email: String, onMessage: (String) -> Unit) -> Unit,
    onConfirmUniEmail: (String) -> Unit,
    onOpenSavedVenue: (String) -> Unit,
    onRemoveSavedVenue: (String) -> Unit,
    onUpdateApiBaseUrl: (String) -> Unit,
    onSyncNow: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    val isDrink = state.vertical == Vertical.DRINK

    var selectedAuthTab by remember { mutableStateOf(AuthTab.DEMO) }
    var loginInput by remember { mutableStateOf("") }
    var loginPassword by remember { mutableStateOf("") }

    var regName by remember { mutableStateOf("") }
    var regEmail by remember { mutableStateOf("") }
    var regPassword by remember { mutableStateOf("") }
    val regInterests = remember { mutableStateListOf<String>() }

    var uniEmail by remember { mutableStateOf("") }
    var uniCode by remember { mutableStateOf("") }
    var uniFeedback by remember { mutableStateOf<String?>(null) }

    var apiUrlInput by remember(state.apiBaseUrl) { mutableStateOf(state.apiBaseUrl) }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = colors.background,
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Surface(
                    color = colors.background,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 10.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(onClick = onClose) {
                            Icon(Icons.Filled.Close, contentDescription = "Închide", tint = colors.onBackground)
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Cont, verificare & salvate",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = colors.onBackground,
                            )
                            Text(
                                text = state.currentUser?.name ?: "Vizitator · poți intra în 1 tap",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onSurfaceMuted,
                            )
                        }
                    }
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(14.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    val user = state.currentUser
                    if (user != null) {
                        // Signed-in Profile Card
                        item {
                            AccountCard(title = "Profil activ") {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.Person,
                                            contentDescription = null,
                                            tint = colors.primary,
                                        )
                                        Column {
                                            Text(
                                                text = user.name,
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = colors.onBackground,
                                            )
                                            user.email?.takeIf { it.isNotBlank() }?.let { email ->
                                                Text(
                                                    text = email,
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = colors.onSurfaceMuted,
                                                )
                                            }
                                        }
                                    }
                                    when {
                                        user.role == "verified-local" -> LocalnicBadge(neighborhood = user.neighborhood)
                                        user.role == "influencer" || user.isInfluencer == true -> InfluencerBadge(
                                            followers = user.followers?.let { "${it / 1000}k" },
                                            isPaid = true,
                                        )
                                        else -> TuristBadge()
                                    }
                                }

                                Surface(
                                    color = colors.surfaceElevated,
                                    shape = MaterialTheme.shapes.small,
                                    border = BorderStroke(1.dp, colors.border),
                                ) {
                                    Text(
                                        text = "Pondere vot: ×${"%.1f".format(user.weightMultiplier)} · ${
                                            if (user.role == "verified-local") "Localnic verificat Timișoara"
                                            else "Verifică statutul de localnic mai jos pentru pondere 2,0×"
                                        }",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.onBackground,
                                        modifier = Modifier.padding(10.dp),
                                    )
                                }

                                if (user.description.isNotBlank()) {
                                    Text(
                                        text = user.description,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.onSurfaceMuted,
                                    )
                                }

                                if (user.interests.isNotEmpty()) {
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        items(user.interests) { interestKey ->
                                            val spec = state.interests.find { it.key == interestKey }
                                            Surface(
                                                color = colors.primary.copy(alpha = 0.1f),
                                                shape = RoundedCornerShape(4.dp),
                                            ) {
                                                Text(
                                                    text = spec?.label ?: interestKey,
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = colors.primary,
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                )
                                            }
                                        }
                                    }
                                }

                                OutlinedButton(
                                    onClick = onLogout,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Icon(Icons.Filled.ExitToApp, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Deconectează-te")
                                }
                            }
                        }

                        // Local Verification Card
                        if (user.role != "verified-local") {
                            item {
                                AccountCard(title = "Verificare Localnic Timișoara (pondere 2,0×)") {
                                    Text(
                                        text = "Localnicii verificați au pondere dublă la Scorul Onest. Alege oricare metodă:",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.onSurfaceMuted,
                                    )

                                    // GPS 3-day check-in
                                    Surface(
                                        color = colors.surfaceElevated,
                                        shape = MaterialTheme.shapes.small,
                                        border = BorderStroke(1.dp, colors.border),
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(10.dp),
                                            verticalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            Text(
                                                text = "1. Check-in GPS Timișoara (${state.localCheckinDays}/3 zile)",
                                                style = MaterialTheme.typography.titleSmall,
                                                color = colors.onBackground,
                                            )
                                            Button(
                                                onClick = onCheckInLocal,
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = colors.localnicBg,
                                                    contentColor = colors.localnicFg,
                                                ),
                                            ) {
                                                Icon(Icons.Filled.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text("Fă check-in azi în Timișoara")
                                            }
                                        }
                                    }

                                    // University email (@e-uvt.ro / @upt.ro)
                                    Surface(
                                        color = colors.surfaceElevated,
                                        shape = MaterialTheme.shapes.small,
                                        border = BorderStroke(1.dp, colors.border),
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(10.dp),
                                            verticalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            Text(
                                                text = "2. Email universitar (@e-uvt.ro / @upt.ro)",
                                                style = MaterialTheme.typography.titleSmall,
                                                color = colors.onBackground,
                                            )
                                            OutlinedTextField(
                                                value = uniEmail,
                                                onValueChange = { uniEmail = it },
                                                modifier = Modifier.fillMaxWidth(),
                                                singleLine = true,
                                                label = { Text("student@e-uvt.ro sau @upt.ro") },
                                                colors = OutlinedTextFieldDefaults.colors(
                                                    focusedBorderColor = colors.primary,
                                                    unfocusedBorderColor = colors.inputBorder,
                                                ),
                                            )
                                            OutlinedButton(
                                                onClick = {
                                                    onStartUniEmail(uniEmail) { msg -> uniFeedback = msg }
                                                },
                                            ) {
                                                Icon(Icons.Filled.Email, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text("Trimite cod verificare")
                                            }

                                            uniFeedback?.let { feedback ->
                                                Text(
                                                    text = feedback,
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = colors.primary,
                                                )
                                            }

                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                OutlinedTextField(
                                                    value = uniCode,
                                                    onValueChange = { uniCode = it },
                                                    modifier = Modifier.weight(1f),
                                                    singleLine = true,
                                                    label = { Text("Cod 6 cifre (offline: 123456)") },
                                                    colors = OutlinedTextFieldDefaults.colors(
                                                        focusedBorderColor = colors.primary,
                                                        unfocusedBorderColor = colors.inputBorder,
                                                    ),
                                                )
                                                Button(
                                                    onClick = { onConfirmUniEmail(uniCode) },
                                                    colors = ButtonDefaults.buttonColors(
                                                        containerColor = colors.primary,
                                                        contentColor = colors.onPrimary,
                                                    ),
                                                ) {
                                                    Text("Confirmă")
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            item {
                                Surface(
                                    color = colors.localnicSoft,
                                    shape = MaterialTheme.shapes.medium,
                                    border = BorderStroke(1.dp, colors.localnicBg),
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.CheckCircle,
                                            contentDescription = null,
                                            tint = colors.localnicBg,
                                        )
                                        Text(
                                            text = "Identitate locală verificată activă · recenziile tale au pondere 2,0×.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = colors.onBackground,
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        // Signed-out Auth Tabs
                        item {
                            AccountCard(title = "Intră în cont") {
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    items(AuthTab.entries) { tab ->
                                        FilterChip(
                                            selected = selectedAuthTab == tab,
                                            onClick = { selectedAuthTab = tab },
                                            label = { Text(tab.label) },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = colors.primary,
                                                selectedLabelColor = colors.onPrimary,
                                            ),
                                        )
                                    }
                                }

                                when (selectedAuthTab) {
                                    AuthTab.DEMO -> {
                                        Text(
                                            text = "Autentificare rapidă în 1 tap pentru testare:",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = colors.onSurfaceMuted,
                                        )
                                        demoUsers.forEach { demo ->
                                            val email = demo.email ?: return@forEach
                                            Surface(
                                                color = colors.surfaceElevated,
                                                shape = MaterialTheme.shapes.small,
                                                border = BorderStroke(1.dp, colors.border),
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable { onLoginDemo(email) },
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(12.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                ) {
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Text(
                                                            text = demo.name,
                                                            style = MaterialTheme.typography.titleSmall,
                                                            color = colors.onBackground,
                                                        )
                                                        Text(
                                                            text = "$email · pondere ×${"%.1f".format(demo.weightMultiplier)}",
                                                            style = MaterialTheme.typography.bodySmall,
                                                            color = colors.onSurfaceMuted,
                                                        )
                                                    }
                                                    if (demo.role == "verified-local") {
                                                        LocalnicBadge(neighborhood = demo.neighborhood)
                                                    } else {
                                                        TuristBadge()
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    AuthTab.LOGIN -> {
                                        OutlinedTextField(
                                            value = loginInput,
                                            onValueChange = { loginInput = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true,
                                            label = { Text("Email sau username") },
                                            leadingIcon = { Icon(Icons.Filled.Email, contentDescription = null) },
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = colors.primary,
                                                unfocusedBorderColor = colors.inputBorder,
                                            ),
                                        )
                                        OutlinedTextField(
                                            value = loginPassword,
                                            onValueChange = { loginPassword = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true,
                                            visualTransformation = PasswordVisualTransformation(),
                                            label = { Text("Parolă") },
                                            leadingIcon = { Icon(Icons.Filled.Lock, contentDescription = null) },
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = colors.primary,
                                                unfocusedBorderColor = colors.inputBorder,
                                            ),
                                        )
                                        Button(
                                            onClick = { onLoginCredentials(loginInput, loginPassword) },
                                            modifier = Modifier.fillMaxWidth(),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = colors.primary,
                                                contentColor = colors.onPrimary,
                                            ),
                                        ) {
                                            Text("Intră în cont")
                                        }
                                    }

                                    AuthTab.REGISTER -> {
                                        OutlinedTextField(
                                            value = regName,
                                            onValueChange = { regName = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true,
                                            label = { Text("Nume afișat") },
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = colors.primary,
                                                unfocusedBorderColor = colors.inputBorder,
                                            ),
                                        )
                                        OutlinedTextField(
                                            value = regEmail,
                                            onValueChange = { regEmail = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true,
                                            label = { Text("Email") },
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = colors.primary,
                                                unfocusedBorderColor = colors.inputBorder,
                                            ),
                                        )
                                        OutlinedTextField(
                                            value = regPassword,
                                            onValueChange = { regPassword = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true,
                                            visualTransformation = PasswordVisualTransformation(),
                                            label = { Text("Parolă (min. 6 caractere)") },
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = colors.primary,
                                                unfocusedBorderColor = colors.inputBorder,
                                            ),
                                        )
                                        if (state.interests.isNotEmpty()) {
                                            Text(
                                                text = "Ce cauți în Timișoara?",
                                                style = MaterialTheme.typography.labelMedium,
                                                color = colors.onSurfaceMuted,
                                            )
                                            InterestSelectorRow(
                                                interests = state.interests,
                                                selected = regInterests,
                                                onToggle = { key ->
                                                    if (key in regInterests) regInterests.remove(key)
                                                    else regInterests.add(key)
                                                },
                                            )
                                        }
                                        Button(
                                            onClick = {
                                                onRegister(regName, regEmail, regPassword, regInterests.toList())
                                            },
                                            modifier = Modifier.fillMaxWidth(),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = colors.primary,
                                                contentColor = colors.onPrimary,
                                            ),
                                        ) {
                                            Text("Creează cont")
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Saved Venues Card
                    item {
                        AccountCard(title = "Localuri salvate (${state.savedVenues.size})") {
                            if (state.savedVenues.isEmpty()) {
                                Text(
                                    text = "Nu ai salvat încă niciun local. Apasă pe inimioară din listă sau hartă.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.onSurfaceMuted,
                                )
                            } else {
                                state.savedVenues.forEach { venue ->
                                    SavedVenueRow(
                                        venue = venue,
                                        onOpen = { onOpenSavedVenue(venue.slug) },
                                        onRemove = { onRemoveSavedVenue(venue.slug) },
                                    )
                                }
                            }
                        }
                    }

                    // Backend REST /api/v1 Configuration Card
                    item {
                        AccountCard(title = "Conexiune Backend REST /api/v1") {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Surface(
                                    color = if (state.backendOnline) colors.localnicSoft else colors.surfaceElevated,
                                    shape = RoundedCornerShape(4.dp),
                                    border = BorderStroke(
                                        1.dp,
                                        if (state.backendOnline) colors.localnicBg else colors.border,
                                    ),
                                ) {
                                    Text(
                                        text = if (state.backendOnline) "ONLINE · API live" else "OFFLINE · Catalog local",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (state.backendOnline) colors.localnicBg else colors.onSurfaceMuted,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    )
                                }
                                if (state.isSyncing) {
                                    Text(
                                        text = "Se sincronizează...",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = colors.onSurfaceMuted,
                                    )
                                }
                            }

                            Text(
                                text = "Pentru emulator Android folosește http://10.0.2.2:3000; pentru telefon fizic folosește IP-ul LAN al serverului.",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onSurfaceMuted,
                            )

                            OutlinedTextField(
                                value = apiUrlInput,
                                onValueChange = { apiUrlInput = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                label = { Text("Base URL server") },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = colors.primary,
                                    unfocusedBorderColor = colors.inputBorder,
                                ),
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Button(
                                    onClick = { onUpdateApiBaseUrl(apiUrlInput) },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = colors.primary,
                                        contentColor = colors.onPrimary,
                                    ),
                                ) {
                                    Text("Salvează URL")
                                }
                                OutlinedButton(
                                    onClick = onSyncNow,
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Sincronizează")
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(24.dp)) }
                }
            }
        }
    }
}

@Composable
private fun AccountCard(
    title: String,
    content: @Composable () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    Surface(
        color = colors.surface,
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(1.dp, colors.border),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = colors.onBackground,
            )
            content()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InterestSelectorRow(
    interests: List<InterestSpec>,
    selected: List<String>,
    onToggle: (String) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        items(interests) { spec ->
            val active = spec.key in selected
            FilterChip(
                selected = active,
                onClick = { onToggle(spec.key) },
                label = { Text(spec.label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = colors.primary,
                    selectedLabelColor = colors.onPrimary,
                ),
            )
        }
    }
}

@Composable
private fun SavedVenueRow(
    venue: Restaurant,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    Surface(
        color = colors.surfaceElevated,
        shape = MaterialTheme.shapes.small,
        border = BorderStroke(1.dp, colors.border),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen),
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ScoreBadge(score = venue.foodQualityScore, isDrink = venue.vertical == "drink")
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = venue.name,
                    style = MaterialTheme.typography.titleSmall,
                    color = colors.onBackground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = "${venue.neighborhood} · ${venue.cuisine}",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            IconButton(onClick = onRemove) {
                Icon(
                    imageVector = Icons.Filled.Favorite,
                    contentDescription = "Elimină din salvate",
                    tint = colors.primary,
                )
            }
        }
    }
}
