package ro.topfood.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import ro.topfood.app.data.model.DomainLogic
import ro.topfood.app.data.model.FoodHeroHeader
import ro.topfood.app.data.model.Restaurant
import ro.topfood.app.data.model.SortOrder
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.data.model.WeekendEvent
import ro.topfood.app.ui.MainUiState
import ro.topfood.app.ui.components.AvertizareaCard
import ro.topfood.app.ui.components.CarouStrip
import ro.topfood.app.ui.components.CrowdMeter
import ro.topfood.app.ui.components.DeliveryBadge
import ro.topfood.app.ui.components.LocalnicBadge
import ro.topfood.app.ui.components.NetworkVenueImage
import ro.topfood.app.ui.components.ScoreBadge
import ro.topfood.app.ui.components.TrapBadge
import ro.topfood.app.ui.components.TrophyMedalBadge
import ro.topfood.app.ui.theme.CondensedDisplayFontFamily
import ro.topfood.app.ui.theme.CondensedLightFontFamily
import ro.topfood.app.ui.theme.LocalTopFoodColors

private val FOOD_FILTER_BUTTONS = listOf(
    "fara-capcane" to "Fără capcane",
    "deschis-acum" to "Deschis acum",
    "sub-50-lei" to "Sub 50 lei",
    "livrare" to "Cu livrare",
)

private val DRINK_FILTER_BUTTONS = listOf(
    "vineri-noaptea" to "Vineri noaptea",
    "in-timpul-saptamanii" to "În timpul săptămânii",
    "muzica-live" to "Muzică live",
    "bere-sub-15-lei" to "Bere sub 15 lei",
)

private val THEMATIC_TABS = listOf(
    "general" to "General",
    "accesibilitate" to "Accesibilitate",
    "lucru" to "Locuri pentru lucru",
    "iesiri" to "Ieșiri",
)

private val CROWD_LEVELS = listOf(
    1 to "Aproape gol",
    2 to "Lejer, găsești masă",
    3 to "Animat",
    4 to "Aproape plin",
    5 to "Plin ochi",
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EditorialListScreen(
    state: MainUiState,
    onSearchChange: (String) -> Unit,
    onToggleFoodFilter: (String) -> Unit,
    onToggleDrinkFilter: (String) -> Unit,
    onSelectNeighborhood: (String) -> Unit,
    onSelectCategory: (String?) -> Unit,
    onSelectSort: (SortOrder) -> Unit,
    onResetFilters: () -> Unit,
    onOpenVenue: (String) -> Unit,
    onToggleSave: (String) -> Unit,
    onOpenMonthlyTop: () -> Unit,
    onOpenAddVenue: () -> Unit,
    onReportCrowd: (Restaurant, Int, String) -> Unit = { _, _, _ -> },
) {
    val colors = LocalTopFoodColors.current
    val isDrink = state.vertical == Vertical.DRINK

    var heroIdx by remember(isDrink) { mutableIntStateOf(state.heroIndex) }
    var showMethodology by remember { mutableStateOf(false) }
    var selectedThematic by remember(isDrink) { mutableStateOf("general") }
    var quietWorkOnly by remember { mutableStateOf(false) }
    var expandedTrapAlert by remember { mutableStateOf(false) }
    var showAllRanked by remember(isDrink, state.searchQuery, state.foodFilters, state.drinkFilters, state.selectedNeighborhood) {
        mutableStateOf(false)
    }
    var sortMenuOpen by remember { mutableStateOf(false) }
    var hoodMenuOpen by remember { mutableStateOf(false) }
    var showVibeCheckDialog by remember { mutableStateOf(false) }

    LaunchedEffect(isDrink, state.foodHeroHeaders.size, state.drinkHeroHeaders.size) {
        val count = if (isDrink) state.drinkHeroHeaders.size else state.foodHeroHeaders.size
        if (count > 1) {
            while (true) {
                delay(7500L)
                heroIdx = (heroIdx + 1) % count
            }
        }
    }

    val organicBase = remember(state.filteredVenues) {
        state.filteredVenues.filter { !it.isSponsored }
    }

    val thematicCountMap = remember(organicBase) {
        mapOf(
            "general" to organicBase.size,
            "accesibilitate" to organicBase.count { v ->
                v.features.any { it.theme == "accesibilitate" && it.items.any { item -> item.state != "unknown" } }
            },
            "lucru" to organicBase.count { v ->
                v.features.any { it.theme == "lucru" && it.items.any { item -> item.state != "unknown" } }
            },
            "iesiri" to organicBase.count { v ->
                v.features.any { it.theme == "iesiri" && it.items.any { item -> item.state != "unknown" } }
            },
        )
    }

    val displayedVenues = remember(organicBase, selectedThematic, quietWorkOnly) {
        if (selectedThematic == "general") {
            organicBase
        } else {
            val themed = organicBase.filter { v ->
                val hasTheme = v.features.any { f ->
                    f.theme == selectedThematic && f.items.any { item -> item.state == "yes" }
                }
                if (!hasTheme) return@filter false
                if (selectedThematic == "lucru" && quietWorkOnly) {
                    val noise = DomainLogic.normalizeRo(v.quick?.noiseMode ?: "")
                    !noise.contains("animat") && !noise.contains("zgomotos")
                } else {
                    true
                }
            }
            themed.sortedByDescending { v ->
                val yesCount = v.features
                    .filter { it.theme == selectedThematic }
                    .flatMap { it.items }
                    .count { it.state == "yes" }
                yesCount * 100.0 + v.foodQualityScore
            }
        }
    }

    val sponsoredVenue = remember(state.eligibleSponsored) {
        state.eligibleSponsored.firstOrNull()
    }

    val trapVenues = remember(state.activeVenues) {
        state.activeVenues
            .filter { it.touristTrapIndex >= DomainLogic.POSSIBLE_TRAP_THRESHOLD }
            .sortedByDescending { it.touristTrapIndex }
    }
    val featuredTrap = trapVenues.firstOrNull()

    val totalReviewsCount = remember(state.activeVenues) {
        state.activeVenues.sumOf { it.reviewCounts?.total ?: it.reviews.size }
    }

    val hasActiveExtraFilters = state.searchQuery.isNotBlank() ||
        state.selectedNeighborhood != "all" ||
        state.selectedCategory != null ||
        state.foodFilters.isNotEmpty() ||
        (isDrink && state.drinkFilters != setOf("vineri-noaptea")) ||
        selectedThematic != "general"

    val listToShow = if (showAllRanked || displayedVenues.size <= 5) displayedVenues else displayedVenues.take(5)
    val firstVenue = listToShow.firstOrNull()
    val ranks2To3 = listToShow.drop(1).take(2)
    val ranks4Plus = listToShow.drop(3)

    LazyColumn(
        contentPadding = PaddingValues(bottom = 28.dp),
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        // 1. Editorial Hero Block + Search + 4 Rectangular Filters
        item {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 18.dp),
            ) {
                if (isDrink) {
                    val headline = state.drinkHeroHeaders.getOrNull(heroIdx)
                        ?: "Unde bei bine vineri seara în Timișoara."
                    Text(
                        text = headline,
                        fontFamily = CondensedDisplayFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 33.sp,
                        lineHeight = 33.sp,
                        letterSpacing = (-0.6).sp,
                        color = colors.onBackground,
                    )
                } else {
                    val hero = state.foodHeroHeaders.getOrNull(heroIdx)
                        ?: FoodHeroHeader("Mâncare cinstită,", "fără capcane.")
                    Text(
                        text = buildAnnotatedString {
                            withStyle(
                                SpanStyle(
                                    fontFamily = CondensedDisplayFontFamily,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = colors.onBackground,
                                )
                            ) {
                                append(hero.main)
                            }
                            append(" ")
                            withStyle(
                                SpanStyle(
                                    fontFamily = CondensedLightFontFamily,
                                    fontWeight = FontWeight.Normal,
                                    color = colors.onBackground,
                                )
                            ) {
                                append(hero.tail)
                            }
                        },
                        fontSize = 33.sp,
                        lineHeight = 33.sp,
                        letterSpacing = (-0.6).sp,
                    )
                }

                // Search label + crisp 4.dp search field
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = if (isDrink) {
                            "Caută un bar, o bere sau un cartier"
                        } else {
                            "Caută un local sau un fel de mâncare"
                        },
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.onBackground,
                    )

                    val inputBg = if (isDrink) colors.surfaceElevated else colors.surface
                    val inputBorder = if (isDrink) colors.inputBorder else colors.onBackground
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = inputBg,
                        border = BorderStroke(1.dp, inputBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp),
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 12.dp),
                        ) {
                            Box(modifier = Modifier.weight(1f)) {
                                if (state.searchQuery.isEmpty()) {
                                    Text(
                                        text = if (isDrink) {
                                            "bere artizanală, jazz, Cetate..."
                                        } else {
                                            "ciorbă, pizza, Iosefin..."
                                        },
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = colors.onSurfaceMuted,
                                    )
                                }
                                BasicTextField(
                                    value = state.searchQuery,
                                    onValueChange = onSearchChange,
                                    singleLine = true,
                                    textStyle = TextStyle(
                                        color = colors.onBackground,
                                        fontSize = 14.sp,
                                    ),
                                    cursorBrush = SolidColor(colors.primary),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                            if (state.searchQuery.isNotEmpty()) {
                                Text(
                                    text = "✕",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.onSurfaceMuted,
                                    modifier = Modifier
                                        .clickable { onSearchChange("") }
                                        .padding(start = 8.dp, top = 4.dp, bottom = 4.dp),
                                )
                            }
                        }
                    }
                }

                // 4 Rectangular Filter Buttons
                val filterButtons = if (isDrink) DRINK_FILTER_BUTTONS else FOOD_FILTER_BUTTONS
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(filterButtons) { (id, label) ->
                        val active = if (isDrink) id in state.drinkFilters else id in state.foodFilters
                        val bg = when {
                            isDrink && active -> Color(0xFFF2A33A)
                            isDrink -> Color(0xFF17382C)
                            active -> colors.onBackground
                            else -> colors.surface
                        }
                        val fg = when {
                            isDrink && active -> Color(0xFF17382C)
                            isDrink -> Color(0xFFF4EEE2)
                            active -> colors.background
                            else -> colors.onBackground
                        }
                        val borderColor = when {
                            isDrink && active -> Color(0xFFF2A33A)
                            isDrink -> Color(0xFF2D5947)
                            active -> colors.onBackground
                            else -> colors.inputBorder
                        }
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = bg,
                            border = BorderStroke(1.dp, borderColor),
                            modifier = Modifier.clickable {
                                if (isDrink) onToggleDrinkFilter(id) else onToggleFoodFilter(id)
                            },
                        ) {
                            Text(
                                text = label,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = fg,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                            )
                        }
                    }
                }
            }
        }

        // 2. Single CarouStrip Divider (Food gingham / Drink subtle border)
        item {
            CarouStrip(isDrink = isDrink, height = 10.dp)
        }

        // 3. Ranking Section Header + Methodology + Thematic Tabs
        item {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = if (isDrink) "Topul de vineri" else "Topul onest",
                        style = MaterialTheme.typography.displayMedium,
                        color = colors.onBackground,
                    )
                    Text(
                        text = if (isDrink) {
                            "plin acum, din raportări"
                        } else {
                            "după $totalReviewsCount de review-uri"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurfaceMuted,
                        modifier = Modifier.padding(bottom = 3.dp),
                    )
                }

                // Methodology link & Neighborhood/Sort compact bar
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = if (showMethodology) {
                            "Ascunde cum calculăm ↑"
                        } else {
                            "Cum calculăm Scorul Onest?"
                        },
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.primary,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable { showMethodology = !showMethodology },
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box {
                            Text(
                                text = if (state.selectedNeighborhood == "all") {
                                    "Cartier ▾"
                                } else {
                                    "${state.selectedNeighborhood} ▾"
                                },
                                style = MaterialTheme.typography.labelMedium,
                                color = if (state.selectedNeighborhood != "all") colors.primary else colors.onSurfaceMuted,
                                modifier = Modifier.clickable { hoodMenuOpen = true },
                            )
                            DropdownMenu(
                                expanded = hoodMenuOpen,
                                onDismissRequest = { hoodMenuOpen = false },
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Toate cartierele") },
                                    onClick = {
                                        hoodMenuOpen = false
                                        onSelectNeighborhood("all")
                                    },
                                )
                                state.city.neighborhoods.forEach { hood ->
                                    DropdownMenuItem(
                                        text = { Text(hood) },
                                        onClick = {
                                            hoodMenuOpen = false
                                            onSelectNeighborhood(hood)
                                        },
                                    )
                                }
                            }
                        }

                        Box {
                            Text(
                                text = "${state.sortOrder.label} ▾",
                                style = MaterialTheme.typography.labelMedium,
                                color = colors.onSurfaceMuted,
                                modifier = Modifier.clickable { sortMenuOpen = true },
                            )
                            DropdownMenu(
                                expanded = sortMenuOpen,
                                onDismissRequest = { sortMenuOpen = false },
                            ) {
                                SortOrder.entries.forEach { order ->
                                    DropdownMenuItem(
                                        text = { Text(order.label) },
                                        onClick = {
                                            sortMenuOpen = false
                                            onSelectSort(order)
                                        },
                                    )
                                }
                            }
                        }
                    }
                }

                if (showMethodology) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = colors.surfaceElevated,
                        border = BorderStroke(1.dp, colors.border),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(12.dp),
                        ) {
                            Text(
                                text = "Cum calculăm Scorul Onest",
                                style = MaterialTheme.typography.titleMedium,
                                color = colors.onBackground,
                            )
                            Text(
                                text = "• Localnic verificat = 2,0× pondere · Vizită verificată = ×1,3",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onBackground,
                            )
                            Text(
                                text = "• Turist / vizitator = 1,0× · Parteneriat influencer = 0,2×",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onSurfaceMuted,
                            )
                            Text(
                                text = "• Plata și eticheta Sponsorizat nu schimbă niciodată locul în top.",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onSurfaceMuted,
                            )
                        }
                    }
                }

                // Thematic Tabs (General / Accesibilitate / Locuri pentru lucru / Ieșiri)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(THEMATIC_TABS) { (id, label) ->
                        val active = selectedThematic == id
                        val count = thematicCountMap[id] ?: 0
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (active) colors.primary else colors.surface,
                            border = BorderStroke(1.dp, if (active) colors.primary else colors.border),
                            modifier = Modifier.clickable { selectedThematic = id },
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(5.dp),
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (active) colors.onPrimary else colors.onBackground,
                                )
                                Text(
                                    text = count.toString(),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (active) colors.onPrimary.copy(alpha = 0.85f) else colors.onSurfaceMuted,
                                )
                            }
                        }
                    }
                }

                if (selectedThematic == "lucru") {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (quietWorkOnly) colors.primary else colors.surface,
                        border = BorderStroke(1.dp, if (quietWorkOnly) colors.primary else colors.inputBorder),
                        modifier = Modifier.clickable { quietWorkOnly = !quietWorkOnly },
                    ) {
                        Text(
                            text = "Doar liniștite",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (quietWorkOnly) colors.onPrimary else colors.onBackground,
                            modifier = Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
                        )
                    }
                }

                if (hasActiveExtraFilters) {
                    Text(
                        text = "Resetează filtrele",
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.primary,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable {
                            selectedThematic = "general"
                            quietWorkOnly = false
                            onResetFilters()
                        },
                    )
                }
            }
        }

        // Empty State
        if (displayedVenues.isEmpty()) {
            item {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = colors.surface,
                    border = BorderStroke(1.dp, colors.border),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(16.dp),
                    ) {
                        Text(
                            text = "Niciun local nu se potrivește filtrelor alese.",
                            style = MaterialTheme.typography.titleMedium,
                            color = colors.onBackground,
                        )
                        Text(
                            text = "Încearcă să ștergi căutarea sau să schimbi filtrele.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onSurfaceMuted,
                        )
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = colors.primary,
                            modifier = Modifier.clickable {
                                selectedThematic = "general"
                                onResetFilters()
                            },
                        ) {
                            Text(
                                text = "Arată toate localurile",
                                style = MaterialTheme.typography.labelMedium,
                                color = colors.onPrimary,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            )
                        }
                    }
                }
            }
        } else {
            // 4. Rank #1 Featured Card
            if (firstVenue != null) {
                item(key = "featured-${firstVenue.id}") {
                    FeaturedVenueCard(
                        venue = firstVenue,
                        isDrink = isDrink,
                        onOpen = { onOpenVenue(firstVenue.slug) },
                        modifier = Modifier.padding(horizontal = 16.dp),
                    )
                }
            }

            // 5. Ranks #2-#3 Hairline Rows
            if (ranks2To3.isNotEmpty()) {
                item {
                    Spacer(Modifier.height(10.dp))
                    Divider(color = colors.border, thickness = 1.dp)
                }
                itemsIndexed(ranks2To3, key = { _, v -> v.id }) { idx, venue ->
                    VenueListRow(
                        rank = idx + 2,
                        venue = venue,
                        isDrink = isDrink,
                        onOpen = { onOpenVenue(venue.slug) },
                    )
                    Divider(color = colors.border, thickness = 1.dp)
                }
            }

            // 6. Modest Sponsored Card (separate from organic numbers)
            if (sponsoredVenue != null && state.searchQuery.isBlank() && selectedThematic == "general") {
                item(key = "sponsored-${sponsoredVenue.id}") {
                    SponsoredVenueRow(
                        venue = sponsoredVenue,
                        onOpen = { onOpenVenue(sponsoredVenue.slug) },
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    )
                }
            }

            // 7. Ranks #4+ Hairline Rows
            if (ranks4Plus.isNotEmpty()) {
                if (sponsoredVenue == null || state.searchQuery.isNotBlank() || selectedThematic != "general") {
                    item {
                        if (ranks2To3.isEmpty()) Divider(color = colors.border, thickness = 1.dp)
                    }
                } else {
                    item { Divider(color = colors.border, thickness = 1.dp) }
                }
                itemsIndexed(ranks4Plus, key = { _, v -> v.id }) { idx, venue ->
                    VenueListRow(
                        rank = idx + 4,
                        venue = venue,
                        isDrink = isDrink,
                        onOpen = { onOpenVenue(venue.slug) },
                    )
                    Divider(color = colors.border, thickness = 1.dp)
                }
            }

            // Expand / Monthly Top footer links
            item {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                ) {
                    if (displayedVenues.size > 5) {
                        Text(
                            text = if (showAllRanked) {
                                "Arată primele 5"
                            } else {
                                "Vezi tot topul (${displayedVenues.size})"
                            },
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.primary,
                            textDecoration = TextDecoration.Underline,
                            modifier = Modifier.clickable { showAllRanked = !showAllRanked },
                        )
                    } else {
                        Spacer(Modifier.width(1.dp))
                    }

                    Text(
                        text = "Clasamentul lunii →",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.onBackground,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable(onClick = onOpenMonthlyTop),
                    )
                }
            }
        }

        // 8. Secondary Editorial Block: "Atenție în Piața Unirii" (Food) OR "Weekendul ăsta" (Drink)
        if (!isDrink && trapVenues.isNotEmpty()) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .background(Color(0xFFB3261E))
                    )
                    Column(
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                    ) {
                        Text(
                            text = "Atenție în Piața Unirii",
                            fontFamily = CondensedDisplayFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 24.sp,
                            color = colors.onBackground,
                        )
                        Text(
                            text = "${trapVenues.size} localuri din centru au scoruri mult mai mari la turiști decât la localnici.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onSurfaceMuted,
                        )
                    }

                    Divider(color = colors.border, thickness = 1.dp)
                    trapVenues.take(4).forEach { trap ->
                        TrapVenueRow(
                            venue = trap,
                            onOpen = { onOpenVenue(trap.slug) },
                        )
                        Divider(color = colors.border, thickness = 1.dp)
                    }

                    if (featuredTrap != null) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        ) {
                            Text(
                                text = if (expandedTrapAlert) {
                                    "Ascunde avertizarea: ${featuredTrap.name} ↑"
                                } else {
                                    "Vezi avertizarea completă: ${featuredTrap.name} ↓"
                                },
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.primary,
                                textDecoration = TextDecoration.Underline,
                                modifier = Modifier.clickable { expandedTrapAlert = !expandedTrapAlert },
                            )
                            if (expandedTrapAlert) {
                                AvertizareaCard(
                                    trapIndex = featuredTrap.touristTrapIndex,
                                    reasons = featuredTrap.trapReasons,
                                    venueName = featuredTrap.name,
                                    subtitle = "${featuredTrap.shortCategory ?: featuredTrap.cuisine} · ${featuredTrap.shortNeighborhood ?: featuredTrap.neighborhood}",
                                    breakdown = featuredTrap.trapBreakdown,
                                )
                            }
                        }
                    }
                }
            }
        } else if (isDrink) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                ) {
                    Divider(color = Color(0xFF285443), thickness = 1.dp)
                    Column(
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                    ) {
                        Text(
                            text = "Weekendul ăsta",
                            fontFamily = CondensedDisplayFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 24.sp,
                            color = colors.onBackground,
                        )
                        Text(
                            text = "Concerte, DJ seturi și seri tematice în barurile din oraș.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onSurfaceMuted,
                        )
                    }

                    state.weekendEvents.forEach { ev ->
                        val venue = state.allVenues.find { it.id == ev.venueId || it.name == ev.venueName }
                        WeekendEventRow(
                            event = ev,
                            photoUrl = venue?.photoUrl.orEmpty(),
                            onClick = { if (venue != null) onOpenVenue(venue.slug) },
                        )
                        Divider(color = Color(0xFF285443), thickness = 1.dp)
                    }

                    Box(modifier = Modifier.padding(16.dp)) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color(0xFFF2A33A),
                            contentColor = Color(0xFF17382C),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showVibeCheckDialog = true },
                        ) {
                            Text(
                                text = "Spune cât e de plin unde ești",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF17382C),
                                modifier = Modifier
                                    .padding(vertical = 13.dp)
                                    .align(Alignment.Center),
                            )
                        }
                    }
                }
            }
        }

        // Propose Missing Venue link at the end
        item {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Text(
                    text = "Lipsește un local din Timișoara? Propune-l redacției →",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceMuted,
                    textDecoration = TextDecoration.Underline,
                    modifier = Modifier.clickable(onClick = onOpenAddVenue),
                )
            }
        }
    }

    if (showVibeCheckDialog && isDrink) {
        VibeCheckDialog(
            drinkVenues = state.drinkVenues,
            onDismiss = { showVibeCheckDialog = false },
            onSubmit = { venue, segments, label ->
                onReportCrowd(venue, segments, label)
                showVibeCheckDialog = false
            },
        )
    }
}

@Composable
private fun FeaturedVenueCard(
    venue: Restaurant,
    isDrink: Boolean,
    onOpen: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    val signature = venue.whatToOrder.firstOrNull { it.isMustOrder } ?: venue.whatToOrder.firstOrNull()

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, colors.border),
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Hero photo banner with dark bottom gradient and #1 pill + Localnici score badge
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (isDrink) 160.dp else 176.dp),
            ) {
                NetworkVenueImage(
                    url = venue.photoUrl,
                    contentDescription = venue.name,
                    modifier = Modifier.fillMaxSize(),
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color(0xCC1A120D)),
                                startY = 80f,
                            )
                        )
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(12.dp),
                ) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (isDrink) Color(0xFFF2A33A) else Color(0xFF3A2418),
                    ) {
                        Text(
                            text = if (isDrink) "#1 În topul de vineri" else "#1 În topul localnicilor",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isDrink) Color(0xFF17382C) else Color(0xFFFBF6EA),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                    LocalnicBadge(
                        label = "Localnici ${DomainLogic.formatScore(venue.localsScore)}",
                    )
                }
            }

            // Editorial body
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.padding(14.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier
                            .weight(1f)
                            .padding(end = 10.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "1",
                                fontFamily = CondensedDisplayFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 26.sp,
                                color = colors.primary,
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = venue.name,
                                style = MaterialTheme.typography.headlineLarge,
                                color = colors.onBackground,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        if (venue.monthlyRank != null && venue.monthlyRank in 1..3) {
                            TrophyMedalBadge(rank = venue.monthlyRank, label = "Top lunar", compact = true)
                        }
                        Text(
                            text = "${venue.shortCategory ?: venue.cuisine} · ${venue.shortNeighborhood ?: venue.neighborhood} · ${venue.priceTier}",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onSurfaceMuted,
                        )
                    }

                    ScoreBadge(
                        score = venue.foodQualityScore,
                        isDrink = isDrink,
                        large = true,
                    )
                }

                Text(
                    text = venue.editorialHeadline,
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.onBackground,
                )

                if (signature != null) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = colors.surfaceElevated,
                        border = BorderStroke(1.dp, colors.border),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            text = buildAnnotatedString {
                                withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = colors.onBackground)) {
                                    append(if (isDrink) "Ce să iei: " else "Recomandat: ")
                                }
                                append("${signature.name} · ${DomainLogic.formatRon(signature.priceRon)}")
                            },
                            fontSize = 12.sp,
                            color = colors.onSurfaceMuted,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                        )
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (isDrink) {
                        CrowdMeter(
                            segments = venue.crowdSegments ?: 3,
                            label = venue.crowdLabel,
                            modifier = Modifier.weight(1f),
                        )
                    } else {
                        DeliveryBadge(
                            delivery = venue.delivery,
                            modifier = Modifier.weight(1f, fill = false),
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "Vezi fișa →",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.primary,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun VenueListRow(
    rank: Int,
    venue: Restaurant,
    isDrink: Boolean,
    onOpen: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Text(
            text = "$rank",
            fontFamily = CondensedDisplayFontFamily,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 22.sp,
            color = colors.onSurfaceMuted,
            modifier = Modifier
                .width(24.dp)
                .padding(top = 2.dp),
        )

        NetworkVenueImage(
            url = venue.photoUrl,
            contentDescription = venue.name,
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(4.dp))
                .border(1.dp, colors.border, RoundedCornerShape(4.dp)),
        )

        Column(
            verticalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.weight(1f),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = venue.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.onBackground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (venue.monthlyRank != null && venue.monthlyRank in 1..3) {
                    TrophyMedalBadge(rank = venue.monthlyRank, compact = true)
                }
            }
            Text(
                text = "${venue.shortCategory ?: venue.cuisine} · ${venue.shortNeighborhood ?: venue.neighborhood} · ${venue.priceTier}",
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurfaceMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = venue.editorialHeadline,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                LocalnicBadge(
                    label = "Localnici ${DomainLogic.formatScore(venue.localsScore)}",
                )
                if (isDrink) {
                    CrowdMeter(segments = venue.crowdSegments ?: 3, label = venue.crowdLabel)
                } else {
                    DeliveryBadge(delivery = venue.delivery)
                }
            }
        }

        ScoreBadge(
            score = venue.foodQualityScore,
            isDrink = isDrink,
            large = false,
        )
    }
}

@Composable
private fun SponsoredVenueRow(
    venue: Restaurant,
    onOpen: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = colors.sponsoredSurface,
        border = BorderStroke(1.dp, colors.inputBorder),
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 11.dp),
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(3.dp),
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 10.dp),
            ) {
                Text(
                    text = "Sponsorizat. Nu schimbă scorul și nici locul în top.",
                    fontSize = 11.sp,
                    color = colors.onSurfaceMuted,
                )
                Text(
                    text = venue.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.onBackground,
                )
                Text(
                    text = "${venue.shortCategory ?: venue.cuisine} · ${venue.shortNeighborhood ?: venue.neighborhood}",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceMuted,
                )
            }
            Text(
                text = DomainLogic.formatScore(venue.foodQualityScore),
                fontFamily = CondensedDisplayFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 22.sp,
                color = colors.onSurfaceMuted,
            )
        }
    }
}

@Composable
private fun TrapVenueRow(
    venue: Restaurant,
    onOpen: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        NetworkVenueImage(
            url = venue.photoUrl,
            contentDescription = venue.name,
            modifier = Modifier
                .size(56.dp)
                .clip(RoundedCornerShape(4.dp))
                .border(1.dp, colors.border, RoundedCornerShape(4.dp)),
        )

        Column(
            verticalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.weight(1f),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = venue.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.onBackground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                TrapBadge(trapIndex = venue.touristTrapIndex)
            }
            Text(
                text = venue.editorialHeadline,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurfaceMuted,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = colors.surfaceElevated,
                border = BorderStroke(1.dp, colors.border),
            ) {
                Text(
                    text = buildAnnotatedString {
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = Color(0xFFB3261E))) {
                            append("Localnici ${DomainLogic.formatScore(venue.localsScore)}")
                        }
                        withStyle(SpanStyle(color = colors.onSurfaceMuted)) {
                            append(" vs. Turiști ${DomainLogic.formatScore(venue.touristsScore)}")
                        }
                    },
                    fontSize = 11.sp,
                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                )
            }
        }

        Text(
            text = DomainLogic.formatScore(venue.foodQualityScore),
            fontFamily = CondensedDisplayFontFamily,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 20.sp,
            color = colors.onSurfaceMuted,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

@Composable
private fun WeekendEventRow(
    event: WeekendEvent,
    photoUrl: String,
    onClick: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        NetworkVenueImage(
            url = photoUrl,
            contentDescription = event.venueName,
            modifier = Modifier
                .size(56.dp)
                .clip(RoundedCornerShape(4.dp))
                .border(1.dp, Color(0xFF285443), RoundedCornerShape(4.dp)),
        )

        Surface(
            shape = RoundedCornerShape(4.dp),
            color = Color(0xFF122B22),
            border = BorderStroke(1.dp, Color(0xFFF2A33A)),
            modifier = Modifier.width(46.dp),
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(vertical = 6.dp),
            ) {
                Text(
                    text = event.dayShort.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFF2A33A),
                )
                Text(
                    text = event.dayNumber,
                    fontFamily = CondensedDisplayFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = Color(0xFFF4EEE2),
                )
            }
        }

        Column(
            verticalArrangement = Arrangement.spacedBy(2.dp),
            modifier = Modifier.weight(1f),
        ) {
            Text(
                text = event.title,
                style = MaterialTheme.typography.titleMedium,
                color = Color(0xFFF4EEE2),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = "${event.venueName}${event.neighborhood?.let { " · $it" } ?: ""} · ${event.details}",
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurfaceMuted,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun VibeCheckDialog(
    drinkVenues: List<Restaurant>,
    onDismiss: () -> Unit,
    onSubmit: (venue: Restaurant, segments: Int, label: String) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    var selectedVenue by remember { mutableStateOf(drinkVenues.firstOrNull()) }
    var selectedSegments by remember { mutableIntStateOf(3) }
    var menuExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Spune cât e de plin unde ești") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Raportările live ajută Timișoara să vadă unde mai sunt mese libere vineri seara.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceMuted,
                )
                Box {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = colors.surfaceElevated,
                        border = BorderStroke(1.dp, colors.inputBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { menuExpanded = true },
                    ) {
                        Text(
                            text = selectedVenue?.name ?: "Alege barul...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.onBackground,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                    DropdownMenu(
                        expanded = menuExpanded,
                        onDismissRequest = { menuExpanded = false },
                    ) {
                        drinkVenues.forEach { bar ->
                            DropdownMenuItem(
                                text = { Text("${bar.name} · ${bar.shortNeighborhood ?: bar.neighborhood}") },
                                onClick = {
                                    selectedVenue = bar
                                    menuExpanded = false
                                },
                            )
                        }
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    CROWD_LEVELS.forEach { (seg, label) ->
                        val active = selectedSegments == seg
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (active) Color(0xFFF2A33A) else colors.surface,
                            border = BorderStroke(1.dp, if (active) Color(0xFFF2A33A) else colors.border),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedSegments = seg },
                        ) {
                            Text(
                                text = "$seg/5 · $label",
                                fontSize = 13.sp,
                                fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                                color = if (active) Color(0xFF17382C) else colors.onBackground,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                enabled = selectedVenue != null,
                onClick = {
                    val v = selectedVenue ?: return@Button
                    val lbl = CROWD_LEVELS.firstOrNull { it.first == selectedSegments }?.second ?: "Animat"
                    onSubmit(v, selectedSegments, lbl)
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFF2A33A),
                    contentColor = Color(0xFF17382C),
                ),
            ) {
                Text("Trimite raportarea")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Anulează") }
        },
    )
}
