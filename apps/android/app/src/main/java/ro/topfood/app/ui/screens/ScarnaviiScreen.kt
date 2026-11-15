package ro.topfood.app.ui.screens

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ro.topfood.app.data.model.Coordinates
import ro.topfood.app.data.model.DomainLogic
import ro.topfood.app.data.model.Restaurant
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.ui.MainUiState
import ro.topfood.app.ui.components.CarouStrip
import ro.topfood.app.ui.components.ScoreBadge
import ro.topfood.app.ui.components.TrapBadge
import ro.topfood.app.ui.theme.LocalTopFoodColors
import kotlin.math.roundToInt
import kotlin.random.Random

private enum class ScarnaviiMode(val title: String, val tag: String, val desc: String) {
    TASTE_TOUR("Tasting Tour", "Traseu de gustat", "Spune-ne de ce ți-e poftă și primești un traseu pietonal în 2–3 opriri."),
    MYSTERY("Busolă secretă", "Aventură", "Te ghidăm spre un local secret doar prin direcție, distanță și indicii."),
    PREFERENCES("Recomandare pe preferințe", "Potrivire", "Alegi bugetul, cartierul și starea de azi și primești localul ideal."),
    OUTING_POLL("Unde ieșim?", "Alegeți împreună", "Selectează 2–4 localuri, trimite sondajul prietenilor și votați."),
    TABLE_DARES("Roata Provocărilor la Masă", "Minigame", "Provocări spontane pentru gașcă — lejer, picant sau haotic."),
    WHO_PAYS("Cine plătește toată masa?", "Minigame · 6 moduri", "Ruletă, Eliminare, Cartea Neagră, Bomba cu Ceas, Barbut sau Împărțire Haotică."),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScarnaviiScreen(
    state: MainUiState,
    onBuildTasteTour: (query: String, cats: List<String>, budgetRon: Double, stopCount: Int) -> Unit,
    onCreateOutingPoll: (List<String>) -> Unit,
    onVoteOutingPoll: (String) -> Unit,
    onClearOutingPoll: () -> Unit,
    onOpenVenue: (String) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    val isDrink = state.vertical == Vertical.DRINK
    var activeMode by remember { mutableStateOf<ScarnaviiMode?>(null) }
    var categoryFilter by remember { mutableStateOf("all") }

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
                    text = "SCÂRNĂVII & JOCURI DE MASĂ",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.primary,
                )
                Text(
                    text = activeMode?.title ?: "Nu știi ce să alegi? Lasă norocul sau busola.",
                    style = MaterialTheme.typography.displaySmall,
                    color = colors.onBackground,
                )
                    if (activeMode != null) {
                        TextButton(
                            onClick = { activeMode = null },
                            contentPadding = PaddingValues(0.dp),
                        ) {
                            Icon(Icons.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Înapoi la toate modurile", color = colors.primary)
                        }
                    } else {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("all" to "Toate", "explore" to "Explorare", "minigame" to "Minigame").forEach { (id, label) ->
                                FilterChip(
                                    selected = categoryFilter == id,
                                    onClick = { categoryFilter = id },
                                    label = { Text(label, style = MaterialTheme.typography.bodySmall) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = colors.primary,
                                        selectedLabelColor = colors.onPrimary,
                                        containerColor = colors.surface,
                                        labelColor = colors.onBackground,
                                    ),
                                )
                            }
                        }
                        Button(
                            onClick = { activeMode = ScarnaviiMode.values().random() },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.secondary,
                                contentColor = colors.onSecondary,
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Alege o scârnăvie la întâmplare")
                        }
                    }
            }
        }

        if (activeMode == null) {
            val filteredModes = ScarnaviiMode.values().filter { mode ->
                when (categoryFilter) {
                    "explore" -> mode in listOf(ScarnaviiMode.TASTE_TOUR, ScarnaviiMode.MYSTERY, ScarnaviiMode.PREFERENCES)
                    "minigame" -> mode in listOf(ScarnaviiMode.OUTING_POLL, ScarnaviiMode.TABLE_DARES, ScarnaviiMode.WHO_PAYS)
                    else -> true
                }
            }
            items(filteredModes) { mode ->
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = colors.surface,
                    border = BorderStroke(1.dp, colors.border),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clickable { activeMode = mode }
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(14.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Surface(
                                shape = RoundedCornerShape(3.dp),
                                color = colors.primary.copy(alpha = 0.14f),
                                contentColor = colors.primary,
                            ) {
                                Text(
                                    text = mode.tag.uppercase(),
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                )
                            }
                            Text("Deschide →", style = MaterialTheme.typography.labelMedium, color = colors.primary)
                        }
                        Text(text = mode.title, style = MaterialTheme.typography.titleLarge, color = colors.onBackground)
                        Text(text = mode.desc, style = MaterialTheme.typography.bodySmall, color = colors.onSurfaceMuted)
                    }
                }
            }
        } else {
            item {
                Box(modifier = Modifier.padding(horizontal = 16.dp)) {
                    when (activeMode!!) {
                        ScarnaviiMode.TASTE_TOUR -> TasteTourPanel(
                            state = state,
                            onBuildTasteTour = onBuildTasteTour,
                            onOpenVenue = onOpenVenue,
                        )
                        ScarnaviiMode.MYSTERY -> MysteryCompassPanel(
                            venues = state.activeVenues.filter { it.touristTrapIndex < 65 }.ifEmpty { state.activeVenues },
                            onOpenVenue = onOpenVenue,
                        )
                        ScarnaviiMode.PREFERENCES -> PreferenceRecommenderPanel(
                            venues = state.allVenues,
                            neighborhoods = state.city.neighborhoods,
                            onOpenVenue = onOpenVenue,
                        )
                        ScarnaviiMode.OUTING_POLL -> OutingPollPanel(
                            state = state,
                            onCreatePoll = onCreateOutingPoll,
                            onVote = onVoteOutingPoll,
                            onReset = onClearOutingPoll,
                            onOpenVenue = onOpenVenue,
                        )
                        ScarnaviiMode.TABLE_DARES -> TableDaresPanel()
                        ScarnaviiMode.WHO_PAYS -> WhoPaysPanel()
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
private fun TasteTourPanel(
    state: MainUiState,
    onBuildTasteTour: (String, List<String>, Double, Int) -> Unit,
    onOpenVenue: (String) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    var query by remember { mutableStateOf("Vreau o pizza și un desert bun") }
    val selectedCats = remember { mutableStateListOf<String>() }
    var budget by remember { mutableFloatStateOf(120f) }
    var stopCount by remember { mutableIntStateOf(2) }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text("De ce ți-e poftă?") },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = colors.surface,
                unfocusedContainerColor = colors.surface,
                focusedBorderColor = colors.primary,
                unfocusedBorderColor = colors.border,
                focusedTextColor = colors.onBackground,
                unfocusedTextColor = colors.onBackground,
            ),
            modifier = Modifier.fillMaxWidth(),
        )

        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            DomainLogic.TASTE_CATEGORIES.forEach { spec ->
                val chosen = spec.id in selectedCats
                FilterChip(
                    selected = chosen,
                    onClick = {
                        if (chosen) selectedCats.remove(spec.id)
                        else if (selectedCats.size < 3) selectedCats.add(spec.id)
                    },
                    label = { Text(spec.label, style = MaterialTheme.typography.bodySmall) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = colors.primary,
                        selectedLabelColor = colors.onPrimary,
                        containerColor = colors.surface,
                        labelColor = colors.onBackground,
                    ),
                )
            }
        }

        Column {
            Text(
                text = "Buget maxim: ${budget.roundToInt()} lei · Opriri: $stopCount",
                style = MaterialTheme.typography.labelMedium,
                color = colors.onBackground,
            )
            Slider(
                value = budget,
                onValueChange = { budget = it },
                valueRange = 40f..250f,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(2, 3).forEach { count ->
                    FilterChip(
                        selected = stopCount == count,
                        onClick = { stopCount = count },
                        label = { Text("$count opriri") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = colors.secondary,
                            selectedLabelColor = colors.onSecondary,
                            containerColor = colors.surface,
                            labelColor = colors.onBackground,
                        ),
                    )
                }
            }
        }

        Button(
            onClick = { onBuildTasteTour(query, selectedCats.toList(), budget.toDouble(), stopCount) },
            colors = ButtonDefaults.buttonColors(containerColor = colors.primary, contentColor = colors.onPrimary),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Generează traseul de gustat")
        }

        state.activeTasteTour?.let { tour ->
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = colors.surface,
                border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(14.dp)
                ) {
                    Text(
                        text = "Traseu gata · ${DomainLogic.formatRon(tour.totalRon)} · ${tour.approximateDistanceKm} km (~${tour.walkingMinutes} min mers)",
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.primary,
                    )
                    tour.stops.forEachIndexed { idx, stop ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = colors.surfaceElevated,
                            border = BorderStroke(1.dp, colors.border),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onOpenVenue(stop.restaurant.slug) }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(10.dp)
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(colors.primary)
                                ) {
                                    Text("${idx + 1}", color = colors.onPrimary, fontWeight = FontWeight.Bold)
                                }
                                Spacer(Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(stop.restaurant.name, style = MaterialTheme.typography.titleMedium, color = colors.onBackground)
                                    Text(
                                        text = "${stop.itemName} · ${DomainLogic.formatRon(stop.priceRon)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.onSurfaceMuted,
                                    )
                                    Text(
                                        text = stop.restaurant.address,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.onSurfaceMuted,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MysteryCompassPanel(
    venues: List<Restaurant>,
    onOpenVenue: (String) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    var target by remember(venues) { mutableStateOf(venues.randomOrNull()) }
    var clueLevel by remember { mutableIntStateOf(1) }
    var revealed by remember { mutableStateOf(false) }

    val origin = Coordinates(45.7558, 21.2286) // Piața Unirii / Centru
    val t = target ?: return
    val distMeters = (DomainLogic.haversineKm(origin, t.coordinates) * 1000.0).roundToInt()
    val (bearing, cardinal) = DomainLogic.compassBearingLabel(origin, t.coordinates)

    Surface(
        shape = RoundedCornerShape(10.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, colors.border),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.padding(14.dp)
        ) {
            Text(
                text = "Busolă spre un local misterios",
                style = MaterialTheme.typography.titleLarge,
                color = colors.onBackground,
            )
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = colors.primary.copy(alpha = 0.12f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "$bearing° ($cardinal)",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = colors.primary,
                    )
                    Text(
                        text = "La aproximativ $distMeters m de centrul Timișoarei",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.onBackground,
                    )
                }
            }

            Text("Indiciul 1: Cartierul este ${t.shortNeighborhood ?: t.neighborhood} · buget ~${DomainLogic.formatRon(t.avgMealPriceRon)}.", style = MaterialTheme.typography.bodySmall, color = colors.onBackground)
            if (clueLevel >= 2) {
                Text("Indiciul 2: Specific ${t.shortCategory ?: t.cuisine} · Scor Onest ${DomainLogic.formatScore(t.foodQualityScore)}/10.", style = MaterialTheme.typography.bodySmall, color = colors.onBackground)
            }
            if (clueLevel >= 3) {
                Text("Indiciul 3: Specialitatea casei este ${t.whatToOrder.firstOrNull()?.name ?: t.editorialHeadline}.", style = MaterialTheme.typography.bodySmall, color = colors.onBackground)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (clueLevel < 3 && !revealed) {
                    OutlinedButton(onClick = { clueLevel++ }, modifier = Modifier.weight(1f)) {
                        Text("Următorul indiciu ($clueLevel/3)")
                    }
                }
                Button(
                    onClick = { revealed = true },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primary, contentColor = colors.onPrimary),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(if (revealed) "Dezvăluit!" else "Am ajuns la ușă!")
                }
            }

            if (revealed) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = colors.surfaceElevated,
                    border = BorderStroke(1.dp, colors.primary),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenVenue(t.slug) }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(12.dp)
                    ) {
                        ScoreBadge(score = t.foodQualityScore, isDrink = t.vertical == "drink")
                        Spacer(Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(t.name, style = MaterialTheme.typography.titleMedium, color = colors.onBackground)
                            Text(t.address, style = MaterialTheme.typography.bodySmall, color = colors.onSurfaceMuted)
                        }
                    }
                }
            }

            TextButton(onClick = {
                target = venues.filter { it.id != t.id }.randomOrNull() ?: t
                clueLevel = 1
                revealed = false
            }) {
                Text("Alege altă destinație secretă", color = colors.primary)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PreferenceRecommenderPanel(
    venues: List<Restaurant>,
    neighborhoods: List<String>,
    onOpenVenue: (String) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    var maxBudget by remember { mutableFloatStateOf(75f) }
    var avoidTraps by remember { mutableStateOf(true) }
    var chosenMood by remember { mutableStateOf("toate") }
    var chosenHood by remember { mutableStateOf("all") }

    val matches = remember(venues, maxBudget, avoidTraps, chosenMood, chosenHood) {
        venues.filter { v ->
            if (avoidTraps && v.touristTrapIndex >= 40) return@filter false
            if (v.avgMealPriceRon > maxBudget) return@filter false
            if (chosenHood != "all" && !DomainLogic.normalizeRo(v.neighborhood).contains(DomainLogic.normalizeRo(chosenHood))) return@filter false
            when (chosenMood) {
                "food" -> v.vertical != "drink"
                "drink" -> v.vertical == "drink"
                else -> true
            }
        }.sortedByDescending { it.foodQualityScore }.take(3)
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Tip ieșire", style = MaterialTheme.typography.labelMedium, color = colors.onBackground)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("toate" to "Oricare", "food" to "Mâncare", "drink" to "Băut & Bar").forEach { (id, label) ->
                FilterChip(
                    selected = chosenMood == id,
                    onClick = { chosenMood = id },
                    label = { Text(label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = colors.primary,
                        selectedLabelColor = colors.onPrimary,
                        containerColor = colors.surface,
                        labelColor = colors.onBackground,
                    ),
                )
            }
        }

        Text("Buget mediu per persoană: până la ${maxBudget.roundToInt()} lei", style = MaterialTheme.typography.labelMedium, color = colors.onBackground)
        Slider(value = maxBudget, onValueChange = { maxBudget = it }, valueRange = 30f..150f)

        FilterChip(
            selected = avoidTraps,
            onClick = { avoidTraps = !avoidTraps },
            leadingIcon = { if (avoidTraps) Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(14.dp)) },
            label = { Text("Exclude capcanele turistice") },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = colors.localnicBg,
                selectedLabelColor = colors.localnicFg,
                containerColor = colors.surface,
                labelColor = colors.onBackground,
            ),
        )

        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            item {
                FilterChip(
                    selected = chosenHood == "all",
                    onClick = { chosenHood = "all" },
                    label = { Text("Orice cartier") },
                )
            }
            items(neighborhoods) { hood ->
                FilterChip(
                    selected = chosenHood == hood,
                    onClick = { chosenHood = if (chosenHood == hood) "all" else hood },
                    label = { Text(hood) },
                )
            }
        }

        Text("Potriviri pentru tine (${matches.size}):", style = MaterialTheme.typography.titleMedium, color = colors.onBackground)
        matches.forEach { venue ->
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = colors.surface,
                border = BorderStroke(1.dp, colors.border),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenVenue(venue.slug) }
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(12.dp)) {
                    ScoreBadge(score = venue.foodQualityScore, isDrink = venue.vertical == "drink")
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(venue.name, style = MaterialTheme.typography.titleMedium, color = colors.onBackground)
                        Text("${venue.cuisine} · ${venue.neighborhood} · ${DomainLogic.formatRon(venue.avgMealPriceRon)}", style = MaterialTheme.typography.bodySmall, color = colors.onSurfaceMuted)
                        Spacer(Modifier.height(2.dp))
                        TrapBadge(trapIndex = venue.touristTrapIndex)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OutingPollPanel(
    state: MainUiState,
    onCreatePoll: (List<String>) -> Unit,
    onVote: (String) -> Unit,
    onReset: () -> Unit,
    onOpenVenue: (String) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    val context = LocalContext.current
    val selected = remember { mutableStateListOf<String>() }
    val pool = state.allVenues.filter { !it.isSponsored }

    val poll = state.activeOutingPoll
    if (poll == null) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                text = "Alege 2–4 localuri pentru sondajul de grup (${selected.size}/4):",
                style = MaterialTheme.typography.titleMedium,
                color = colors.onBackground,
            )
            pool.take(12).forEach { venue ->
                val isSelected = venue.slug in selected
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isSelected) colors.primary.copy(alpha = 0.12f) else colors.surface,
                    border = BorderStroke(1.dp, if (isSelected) colors.primary else colors.border),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            if (isSelected) selected.remove(venue.slug)
                            else if (selected.size < 4) selected.add(venue.slug)
                        }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.padding(12.dp)
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(venue.name, style = MaterialTheme.typography.titleMedium, color = colors.onBackground)
                            Text("${venue.cuisine} · ${venue.neighborhood}", style = MaterialTheme.typography.bodySmall, color = colors.onSurfaceMuted)
                        }
                        if (isSelected) {
                            Icon(Icons.Filled.Check, contentDescription = null, tint = colors.primary)
                        }
                    }
                }
            }
            Button(
                onClick = { onCreatePoll(selected.toList()) },
                enabled = selected.size in 2..4,
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary, contentColor = colors.onPrimary),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Creează sondajul „Unde ieșim?”")
            }
        }
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                text = "Sondaj activ · ${poll.totalVotes} voturi totale",
                style = MaterialTheme.typography.titleLarge,
                color = colors.onBackground,
            )
            poll.venueIds.forEach { slug ->
                val venue = state.allVenues.find { it.slug == slug || it.id == slug }
                val count = poll.counts[slug] ?: 0
                val isMine = poll.myVote == slug
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isMine) colors.primary.copy(alpha = 0.14f) else colors.surface,
                    border = BorderStroke(1.dp, if (isMine) colors.primary else colors.border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.padding(12.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clickable(enabled = venue != null) { venue?.let { onOpenVenue(it.slug) } }
                        ) {
                            Text(venue?.name ?: slug, style = MaterialTheme.typography.titleMedium, color = colors.onBackground)
                            Text("$count voturi", style = MaterialTheme.typography.bodySmall, color = colors.onSurfaceMuted)
                        }
                        Button(
                            onClick = { onVote(slug) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isMine) colors.secondary else colors.primary,
                                contentColor = if (isMine) colors.onSecondary else colors.onPrimary,
                            ),
                        ) {
                            Text(if (isMine) "Votul tău" else "Votează")
                        }
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = {
                        val url = poll.shareUrl ?: "https://topfood.ro/unde-iesim/${poll.token}"
                        val sendIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, "Unde ieșim în Timișoara? Votează aici: $url")
                        }
                        runCatching { context.startActivity(Intent.createChooser(sendIntent, "Trimite sondajul")) }
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Filled.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Trimite link")
                }
                OutlinedButton(onClick = onReset, modifier = Modifier.weight(1f)) {
                    Text("Sondaj nou")
                }
            }
        }
    }
}

private val TABLE_DARES_LIST = listOf(
    "Lejer" to "Cel din stânga ta alege următoarea băutură sau garnitură pentru tine.",
    "Lejer" to "Fiecare spune care a fost cea mai proastă capcană turistică în care a mâncat vreodată.",
    "Picant" to "Turnul telefoanelor: toate telefoanele cu fața în jos în mijloc. Primul care îl atinge plătește un rând!",
    "Picant" to "Comandă folosind doar gesturi (fără cuvinte) următorul preparat de la ospătar.",
    "Haotic" to "Schimb de farfurii: timp de 5 minute mănânci din farfuria persoanei din fața ta.",
    "Haotic" to "Cine râde primul în următoarele 60 de secunde primește un șot de lămâie sau apă cu piper!",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TableDaresPanel() {
    val colors = LocalTopFoodColors.current
    var tier by remember { mutableStateOf("Toate") }
    var currentDare by remember { mutableStateOf(TABLE_DARES_LIST.first()) }

    Surface(
        shape = RoundedCornerShape(10.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, colors.border),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.padding(14.dp)
        ) {
            Text("Roata Provocărilor la Masă", style = MaterialTheme.typography.titleLarge, color = colors.onBackground)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Toate", "Lejer", "Picant", "Haotic").forEach { t ->
                    FilterChip(
                        selected = tier == t,
                        onClick = { tier = t },
                        label = { Text(t, style = MaterialTheme.typography.bodySmall) },
                    )
                }
            }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = colors.primary.copy(alpha = 0.12f),
                border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(16.dp)) {
                    Text(currentDare.first.uppercase(), style = MaterialTheme.typography.labelSmall, color = colors.primary)
                    Text(currentDare.second, style = MaterialTheme.typography.titleMedium, color = colors.onBackground)
                }
            }
            Button(
                onClick = {
                    val pool = if (tier == "Toate") TABLE_DARES_LIST else TABLE_DARES_LIST.filter { it.first == tier }
                    currentDare = pool.random()
                },
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary, contentColor = colors.onPrimary),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Învârte roata provocării")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WhoPaysPanel() {
    val colors = LocalTopFoodColors.current
    var playersInput by remember { mutableStateOf("Andreea, Luca, Radu, Mara") }
    var gameMode by remember { mutableStateOf("Ruletă") }
    var resultText by remember { mutableStateOf<String?>(null) }

    val modes = listOf("Ruletă", "Eliminare", "Cartea Neagră", "Bomba cu Ceas", "Barbut (2 zaruri)", "Împărțire Haotică %")
    val players = playersInput.split(",").map { it.trim() }.filter { it.isNotBlank() }

    Surface(
        shape = RoundedCornerShape(10.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, colors.border),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.padding(14.dp)
        ) {
            Text("Cine plătește toată masa?", style = MaterialTheme.typography.titleLarge, color = colors.onBackground)
            OutlinedTextField(
                value = playersInput,
                onValueChange = { playersInput = it },
                label = { Text("Jucători la masă (separați prin virgulă)") },
                modifier = Modifier.fillMaxWidth(),
            )
            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(modes) { m ->
                    FilterChip(
                        selected = gameMode == m,
                        onClick = { gameMode = m },
                        label = { Text(m, style = MaterialTheme.typography.bodySmall) },
                    )
                }
            }

            Button(
                onClick = {
                    if (players.size < 2) {
                        resultText = "Adaugă cel puțin 2 jucători!"
                    } else {
                        resultText = when (gameMode) {
                            "Barbut (2 zaruri)" -> {
                                val rolls = players.map {
                                    val d1 = Random.nextInt(1, 7)
                                    val d2 = Random.nextInt(1, 7)
                                    Triple(it, d1 + d2, "$d1+$d2")
                                }
                                val loser = rolls.minBy { it.second }
                                val summary = rolls.joinToString("\n") { "• ${it.first}: ${it.third} (${it.second})" }
                                "$summary\n\nPlătește nota: ${loser.first}!"
                            }
                            "Împărțire Haotică %" -> {
                                val weights = players.map { Random.nextInt(5, 45) }
                                val total = weights.sum().toDouble()
                                players.zip(weights).joinToString("\n") { (p, w) ->
                                    val pct = ((w / total) * 100.0).roundToInt()
                                    "• $p plătește $pct% din notă"
                                }
                            }
                            "Eliminare" -> {
                                val shuffled = players.shuffled()
                                val saved = shuffled.dropLast(1).joinToString(" → ")
                                "Eliminați în siguranță: $saved\n\nA rămas pe notă: ${shuffled.last()}!"
                            }
                            else -> {
                                val chosen = players.random()
                                "[$gameMode] Sorții au decis: $chosen plătește masa azi!"
                            }
                        }
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary, contentColor = colors.onPrimary),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Joacă · $gameMode")
            }

            resultText?.let { res ->
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = colors.warning.copy(alpha = 0.2f),
                    border = BorderStroke(1.dp, colors.warning),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = res,
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.onBackground,
                        modifier = Modifier.padding(14.dp),
                    )
                }
            }
        }
    }
}
