package ro.topfood.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ro.topfood.app.data.model.NavSection
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.ui.components.BrandWordmark
import ro.topfood.app.ui.components.CarouMark
import ro.topfood.app.ui.components.CoasterMark
import ro.topfood.app.ui.screens.AccountSheet
import ro.topfood.app.ui.screens.EditorialListScreen
import ro.topfood.app.ui.screens.FidelityScreen
import ro.topfood.app.ui.screens.MapScreen
import ro.topfood.app.ui.screens.MonthlyTopScreen
import ro.topfood.app.ui.screens.ScarnaviiScreen
import ro.topfood.app.ui.screens.VenueDetailSheet
import ro.topfood.app.ui.theme.LocalTopFoodColors
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun TopFoodAppShell(
    viewModel: MainViewModel,
) {
    val state by viewModel.uiState.collectAsState()
    val colors = LocalTopFoodColors.current
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.statusMessage) {
        val msg = state.statusMessage
        if (!msg.isNullOrBlank()) {
            snackbarHostState.showSnackbar(msg)
            viewModel.clearStatusMessage()
        }
    }

    Scaffold(
        containerColor = colors.background,
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        topBar = {
            TopFoodMasthead(
                state = state,
                onBrandClick = { viewModel.setNavSection(NavSection.TOP) },
                onSwitchVertical = {
                    viewModel.setVertical(if (state.vertical == Vertical.DRINK) Vertical.FOOD else Vertical.DRINK)
                },
                onToggleDarkMode = viewModel::toggleDarkMode,
                onOpenAccount = viewModel::openAccountSheet,
            )
        },
        bottomBar = {
            TopFoodBottomBar(
                selectedSection = state.navSection,
                onSelectSection = viewModel::setNavSection,
            )
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(colors.background),
        ) {
            when (state.navSection) {
                NavSection.TOP -> EditorialListScreen(
                    state = state,
                    onSearchChange = viewModel::setSearchQuery,
                    onToggleFoodFilter = viewModel::toggleFoodFilter,
                    onToggleDrinkFilter = viewModel::toggleDrinkFilter,
                    onSelectNeighborhood = viewModel::setSelectedNeighborhood,
                    onSelectCategory = viewModel::setSelectedCategory,
                    onSelectSort = viewModel::setSortOrder,
                    onResetFilters = viewModel::resetFilters,
                    onOpenVenue = viewModel::openVenueDetail,
                    onToggleSave = viewModel::toggleSaveVenue,
                    onOpenMonthlyTop = { viewModel.setNavSection(NavSection.MONTHLY) },
                    onOpenAddVenue = viewModel::openAddVenueDialog,
                    onReportCrowd = viewModel::reportCrowd,
                )

                NavSection.MAP -> MapScreen(
                    state = state,
                    onSelectTaste = viewModel::setMapTaste,
                    onToggleTouristZones = viewModel::toggleMapTouristZones,
                    onOpenVenue = viewModel::openVenueDetail,
                    onClearFocusSlug = { viewModel.setMapFocusSlug(null) },
                )

                NavSection.MONTHLY -> MonthlyTopScreen(
                    state = state,
                    onSelectMonth = viewModel::selectMonth,
                    onCastMonthlyVote = viewModel::castMonthlyVote,
                    onOpenVenue = viewModel::openVenueDetail,
                    onOpenLogin = viewModel::openAccountSheet,
                )

                NavSection.SCARNAVII -> ScarnaviiScreen(
                    state = state,
                    onBuildTasteTour = viewModel::buildTasteTour,
                    onCreateOutingPoll = viewModel::createOutingPoll,
                    onVoteOutingPoll = viewModel::voteInOutingPoll,
                    onClearOutingPoll = viewModel::clearOutingPoll,
                    onOpenVenue = viewModel::openVenueDetail,
                )

                NavSection.FIDELITATE -> FidelityScreen(
                    state = state,
                    onStampProgram = viewModel::stampLoyaltyProgram,
                    onCreatePersonalCard = viewModel::createPersonalLoyaltyCard,
                    onOpenLogin = viewModel::openAccountSheet,
                )
            }
        }
    }

    if (state.showAddVenueDialog) {
        AddMissingVenueDialog(
            onDismiss = viewModel::closeAddVenueDialog,
            onSubmit = viewModel::submitNewVenue,
        )
    }

    state.selectedVenue?.let { selected ->
        val isSaved = selected.slug in state.savedSlugs || selected.id in state.savedSlugs
        VenueDetailSheet(
            venue = selected,
            isSaved = isSaved,
            currentUser = state.currentUser,
            questions = state.questions,
            onClose = viewModel::closeVenueDetail,
            onToggleSave = viewModel::toggleSaveVenue,
            onLocateOnMap = viewModel::locateVenueOnMap,
            onSubmitReview = viewModel::submitReview,
            onEditOwnReview = viewModel::editOwnReview,
            onDeleteOwnReview = viewModel::deleteOwnReview,
            onVoteHelpful = viewModel::voteHelpful,
            onReportCrowd = viewModel::reportCrowd,
            onCastQuickVote = viewModel::castQuickVote,
            onSubmitVideo = viewModel::submitVenueVideo,
            onOpenLogin = viewModel::openAccountSheet,
        )
    }

    if (state.showAccountSheet) {
        AccountSheet(
            state = state,
            demoUsers = viewModel.demoUsers,
            onClose = viewModel::closeAccountSheet,
            onLoginDemo = viewModel::loginDemo,
            onLoginCredentials = viewModel::loginWithCredentials,
            onRegister = viewModel::registerAccount,
            onLogout = viewModel::logout,
            onCheckInLocal = viewModel::checkInCityLocal,
            onStartUniEmail = viewModel::startUniEmail,
            onConfirmUniEmail = viewModel::confirmUniEmail,
            onOpenSavedVenue = { slug ->
                viewModel.closeAccountSheet()
                viewModel.openVenueDetail(slug)
            },
            onRemoveSavedVenue = viewModel::toggleSaveVenue,
            onUpdateApiBaseUrl = viewModel::updateApiBaseUrl,
            onSyncNow = viewModel::refreshLiveBackend,
        )
    }
}

@Composable
private fun TopFoodMasthead(
    state: MainUiState,
    onBrandClick: () -> Unit,
    onSwitchVertical: () -> Unit,
    onToggleDarkMode: () -> Unit,
    onOpenAccount: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    val isDrink = state.vertical == Vertical.DRINK
    val badgeCount = state.savedSlugs.size + state.localCheckinDays

    Surface(
        color = colors.background,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            ) {
                BrandWordmark(
                    vertical = state.vertical,
                    onClick = onBrandClick,
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    // Vertical Switch (CoasterMark + "Drink" on Food, CarouMark + "Food" on Drink)
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = colors.surfaceElevated,
                        border = BorderStroke(1.dp, colors.inputBorder),
                        modifier = Modifier.clickable(onClick = onSwitchVertical),
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp),
                        ) {
                            if (isDrink) {
                                CarouMark(size = 16.dp)
                                Text(
                                    text = "Food",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = colors.onBackground,
                                )
                            } else {
                                CoasterMark(size = 16.dp)
                                Text(
                                    text = "Drink",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = colors.onBackground,
                                )
                            }
                        }
                    }

                    // Dark Mode toggle (only on Food, matching Navbar.tsx)
                    if (!isDrink) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = colors.surfaceElevated,
                            border = BorderStroke(1.dp, colors.inputBorder),
                            modifier = Modifier
                                .size(34.dp)
                                .clickable(onClick = onToggleDarkMode),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                ThemeIconCanvas(
                                    isDark = state.darkMode,
                                    tint = colors.onBackground,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        }
                    }

                    // Saved / Account Bookmark icon + badge
                    Box {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = colors.surfaceElevated,
                            border = BorderStroke(1.dp, colors.inputBorder),
                            modifier = Modifier
                                .size(34.dp)
                                .clickable(onClick = onOpenAccount),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                AccountIconCanvas(
                                    loggedIn = state.currentUser != null,
                                    tint = colors.onBackground,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        }
                        if (badgeCount > 0) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = 4.dp, y = (-4).dp)
                                    .size(16.dp)
                                    .clip(CircleShape)
                                    .background(colors.primary),
                            ) {
                                Text(
                                    text = badgeCount.coerceAtMost(99).toString(),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.onPrimary,
                                )
                            }
                        }
                    }

                    // Compact "Cont" CTA when not logged in
                    if (state.currentUser == null) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = colors.primary,
                            contentColor = colors.onPrimary,
                            modifier = Modifier.clickable(onClick = onOpenAccount),
                        ) {
                            Text(
                                text = "Cont",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                            )
                        }
                    }
                }
            }
            Divider(color = colors.border, thickness = 1.dp)
        }
    }
}

@Composable
private fun TopFoodBottomBar(
    selectedSection: NavSection,
    onSelectSection: (NavSection) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    Surface(
        color = colors.background,
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding(),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Divider(color = colors.border, thickness = 1.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(58.dp),
            ) {
                NavSection.entries.forEach { section ->
                    val selected = selectedSection == section
                    val tint = if (selected) colors.primary else colors.onSurfaceMuted
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxSize()
                            .clickable { onSelectSection(section) },
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(2.5.dp)
                                .background(if (selected) colors.primary else Color.Transparent)
                        )
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(bottom = 2.dp),
                        ) {
                            NavVectorIcon(
                                section = section,
                                tint = tint,
                                modifier = Modifier.size(19.dp),
                            )
                            Spacer(Modifier.height(3.dp))
                            Text(
                                text = section.label,
                                fontSize = 11.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                color = tint,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ThemeIconCanvas(
    isDark: Boolean,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier) {
        val u = size.minDimension / 24f
        if (isDark) {
            // Crisp Sun
            drawCircle(
                color = tint,
                radius = 4.2f * u,
                center = Offset(12f * u, 12f * u),
                style = Stroke(width = 2f * u),
            )
            for (i in 0 until 8) {
                val angle = Math.toRadians(i * 45.0)
                val sx = 12f * u + (cos(angle) * 7f * u).toFloat()
                val sy = 12f * u + (sin(angle) * 7f * u).toFloat()
                val ex = 12f * u + (cos(angle) * 9.5f * u).toFloat()
                val ey = 12f * u + (sin(angle) * 9.5f * u).toFloat()
                drawLine(tint, Offset(sx, sy), Offset(ex, ey), strokeWidth = 2f * u, cap = StrokeCap.Round)
            }
        } else {
            // Crisp Moon
            val path = Path().apply {
                moveTo(20.5f * u, 14.5f * u)
                cubicTo(19f * u, 19.5f * u, 13.5f * u, 22f * u, 8.5f * u, 20f * u)
                cubicTo(3.8f * u, 18f * u, 2f * u, 12.2f * u, 4.5f * u, 7.6f * u)
                cubicTo(6.2f * u, 4.4f * u, 9.6f * u, 2.8f * u, 12.8f * u, 3f * u)
                cubicTo(10.2f * u, 6.2f * u, 10.6f * u, 11f * u, 13.6f * u, 13.8f * u)
                cubicTo(15.6f * u, 15.6f * u, 18.2f * u, 15.8f * u, 20.5f * u, 14.5f * u)
                close()
            }
            drawPath(path, color = tint, style = Stroke(width = 2f * u, join = StrokeJoin.Round))
        }
    }
}

@Composable
private fun AccountIconCanvas(
    loggedIn: Boolean,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier) {
        val u = size.minDimension / 24f
        if (loggedIn) {
            drawCircle(
                color = tint,
                radius = 4f * u,
                center = Offset(12f * u, 8f * u),
                style = Stroke(width = 2f * u),
            )
            val arc = Path().apply {
                moveTo(5f * u, 20f * u)
                cubicTo(5f * u, 16f * u, 8f * u, 14.5f * u, 12f * u, 14.5f * u)
                cubicTo(16f * u, 14.5f * u, 19f * u, 16f * u, 19f * u, 20f * u)
            }
            drawPath(arc, color = tint, style = Stroke(width = 2f * u, cap = StrokeCap.Round))
        } else {
            val bookmark = Path().apply {
                moveTo(6f * u, 4f * u)
                lineTo(18f * u, 4f * u)
                lineTo(18f * u, 20f * u)
                lineTo(12f * u, 15.5f * u)
                lineTo(6f * u, 20f * u)
                close()
            }
            drawPath(bookmark, color = tint, style = Stroke(width = 2f * u, join = StrokeJoin.Round))
        }
    }
}

@Composable
private fun NavVectorIcon(
    section: NavSection,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier) {
        val u = size.minDimension / 24f
        val stroke = Stroke(width = 1.9f * u, cap = StrokeCap.Round, join = StrokeJoin.Round)
        when (section) {
            NavSection.TOP -> {
                // ListOrdered
                listOf(6f, 12f, 18f).forEach { y ->
                    drawCircle(tint, radius = 1.4f * u, center = Offset(4.5f * u, y * u))
                    drawLine(tint, Offset(9.5f * u, y * u), Offset(20.5f * u, y * u), strokeWidth = 2f * u, cap = StrokeCap.Round)
                }
            }
            NavSection.MAP -> {
                // MapPin
                val pin = Path().apply {
                    moveTo(12f * u, 21f * u)
                    cubicTo(12f * u, 21f * u, 18.5f * u, 14.8f * u, 18.5f * u, 9.8f * u)
                    cubicTo(18.5f * u, 6f * u, 15.6f * u, 3f * u, 12f * u, 3f * u)
                    cubicTo(8.4f * u, 3f * u, 5.5f * u, 6f * u, 5.5f * u, 9.8f * u)
                    cubicTo(5.5f * u, 14.8f * u, 12f * u, 21f * u, 12f * u, 21f * u)
                    close()
                }
                drawPath(pin, tint, style = stroke)
                drawCircle(tint, radius = 2.4f * u, center = Offset(12f * u, 9.8f * u), style = stroke)
            }
            NavSection.MONTHLY -> {
                // Trophy
                val cup = Path().apply {
                    moveTo(7f * u, 4f * u)
                    lineTo(17f * u, 4f * u)
                    lineTo(17f * u, 10f * u)
                    cubicTo(17f * u, 13.5f * u, 14.8f * u, 15.5f * u, 12f * u, 15.5f * u)
                    cubicTo(9.2f * u, 15.5f * u, 7f * u, 13.5f * u, 7f * u, 10f * u)
                    close()
                }
                drawPath(cup, tint, style = stroke)
                drawLine(tint, Offset(12f * u, 15.5f * u), Offset(12f * u, 20f * u), strokeWidth = 2f * u, cap = StrokeCap.Round)
                drawLine(tint, Offset(8f * u, 20f * u), Offset(16f * u, 20f * u), strokeWidth = 2f * u, cap = StrokeCap.Round)
                drawArc(
                    color = tint,
                    startAngle = 90f,
                    sweepAngle = 180f,
                    useCenter = false,
                    topLeft = Offset(3.5f * u, 5.5f * u),
                    size = Size(3.5f * u, 5.5f * u),
                    style = stroke,
                )
                drawArc(
                    color = tint,
                    startAngle = -90f,
                    sweepAngle = 180f,
                    useCenter = false,
                    topLeft = Offset(17f * u, 5.5f * u),
                    size = Size(3.5f * u, 5.5f * u),
                    style = stroke,
                )
            }
            NavSection.SCARNAVII -> {
                // Die
                drawRoundRect(
                    color = tint,
                    topLeft = Offset(3.5f * u, 3.5f * u),
                    size = Size(17f * u, 17f * u),
                    cornerRadius = CornerRadius(3f * u, 3f * u),
                    style = stroke,
                )
                listOf(8.5f to 8.5f, 15.5f to 8.5f, 12f to 12f, 8.5f to 15.5f, 15.5f to 15.5f).forEach { (px, py) ->
                    drawCircle(tint, radius = 1.25f * u, center = Offset(px * u, py * u))
                }
            }
            NavSection.FIDELITATE -> {
                // QrCode
                drawRoundRect(tint, Offset(3.5f * u, 3.5f * u), Size(6.5f * u, 6.5f * u), CornerRadius(1f * u), style = stroke)
                drawRoundRect(tint, Offset(14f * u, 3.5f * u), Size(6.5f * u, 6.5f * u), CornerRadius(1f * u), style = stroke)
                drawRoundRect(tint, Offset(3.5f * u, 14f * u), Size(6.5f * u, 6.5f * u), CornerRadius(1f * u), style = stroke)
                drawRect(tint, Offset(14f * u, 14f * u), Size(2.5f * u, 2.5f * u))
                drawRect(tint, Offset(18f * u, 14f * u), Size(2.5f * u, 2.5f * u))
                drawRect(tint, Offset(14f * u, 18f * u), Size(2.5f * u, 2.5f * u))
                drawRect(tint, Offset(18f * u, 18f * u), Size(2.5f * u, 2.5f * u))
            }
        }
    }
}

@Composable
private fun AddMissingVenueDialog(
    onDismiss: () -> Unit,
    onSubmit: (name: String, address: String, neighborhood: String) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var neighborhood by remember { mutableStateOf("Cetate") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Propune un local lipsă") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Localurile propuse sunt trimise către echipa editorială din Timișoara.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceMuted,
                )
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    label = { Text("Numele localului") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.inputBorder,
                    ),
                )
                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    label = { Text("Adresă (ex: Str. Mercy 5)") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.inputBorder,
                    ),
                )
                OutlinedTextField(
                    value = neighborhood,
                    onValueChange = { neighborhood = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    label = { Text("Cartier (ex: Cetate, Fabric, Elisabetin)") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.inputBorder,
                    ),
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(name, address, neighborhood) },
                enabled = name.trim().length >= 2 && address.trim().length >= 4,
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.primary,
                    contentColor = colors.onPrimary,
                ),
            ) {
                Text("Trimite propunerea")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Anulează") }
        },
    )
}
