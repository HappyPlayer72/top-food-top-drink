package ro.topfood.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ro.topfood.app.data.model.ComputedCategoryVoteTop
import ro.topfood.app.data.model.DomainLogic
import ro.topfood.app.data.model.MonthlyAwards
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.ui.MainUiState
import ro.topfood.app.ui.components.NetworkVenueImage
import ro.topfood.app.ui.components.ScoreBadge
import ro.topfood.app.ui.components.TrophyMedalBadge
import ro.topfood.app.ui.theme.LocalTopFoodColors

private fun formatMonthRo(ym: String): String = when (ym) {
    "2026-11" -> "Noiembrie 2026"
    "2026-10" -> "Octombrie 2026"
    "2026-09" -> "Septembrie 2026"
    else -> ym
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MonthlyTopScreen(
    state: MainUiState,
    onSelectMonth: (String) -> Unit,
    onCastMonthlyVote: (categoryId: String, venueSlug: String, venueName: String) -> Unit,
    onOpenVenue: (String) -> Unit,
    onOpenLogin: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    val isDrink = state.vertical == Vertical.DRINK
    var activeTab by remember { mutableStateOf("clasament") } // "clasament" | "vot"
    var selectedCategoryId by remember { mutableStateOf("all") }

    val activeVoteMonth = state.availableMonths.firstOrNull() ?: "2026-11"
    val isVotingOpen = state.selectedMonth == activeVoteMonth
    val monthKey = "${state.selectedMonth}:${state.vertical.apiValue}"
    val countsByCat = state.voteCountsByMonthKey[monthKey].orEmpty()
    val myVotesByCat = state.myVotesByMonthKey[monthKey].orEmpty()

    val baseCategories = state.publicVoteCategories[state.vertical.apiValue]?.get(state.selectedMonth)
        ?: state.publicVoteCategories[state.vertical.apiValue]?.get("2026-11")
        ?: emptyList()

    val computedCategories: List<ComputedCategoryVoteTop> = remember(
        baseCategories,
        state.activeVenues,
        state.vertical,
        countsByCat,
    ) {
        baseCategories.map { cat ->
            DomainLogic.mergeCategoryTopWithVotes(
                category = cat,
                venues = state.activeVenues,
                vertical = state.vertical,
                extraVotesBySlug = countsByCat[cat.id].orEmpty(),
            )
        }
    }

    val top10Venues = remember(state.activeVenues) {
        state.activeVenues
            .filter { !it.isSponsored }
            .sortedByDescending { it.monthlyScore ?: it.foodQualityScore }
            .take(10)
    }

    val awards: MonthlyAwards? = state.monthlyAwards[state.vertical]

    LazyColumn(
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
    ) {
        // Header
        item {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = "TOPUL LUNII · ${formatMonthRo(state.selectedMonth).uppercase()}",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.primary,
                )
                Text(
                    text = if (isDrink) {
                        "Premiile și clasamentul TopDrink"
                    } else {
                        "Clasamentul onest și votul publicului"
                    },
                    style = MaterialTheme.typography.displaySmall,
                    color = colors.onBackground,
                )

                // Month Selector
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.availableMonths) { ym ->
                        val selected = state.selectedMonth == ym
                        FilterChip(
                            selected = selected,
                            onClick = { onSelectMonth(ym) },
                            label = { Text(formatMonthRo(ym), style = MaterialTheme.typography.labelMedium) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = colors.secondary,
                                selectedLabelColor = colors.onSecondary,
                                containerColor = colors.surface,
                                labelColor = colors.onBackground,
                            ),
                        )
                    }
                }

                // Submenu Tabs
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val tabs = listOf("clasament" to "Clasament & Premii", "vot" to "Votul Publicului")
                    tabs.forEach { (id, label) ->
                        val active = activeTab == id
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (active) colors.primary else colors.surface,
                            border = BorderStroke(1.dp, if (active) colors.primary else colors.border),
                            modifier = Modifier
                                .weight(1f)
                                .clickable { activeTab = id }
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.labelMedium,
                                color = if (active) colors.onPrimary else colors.onBackground,
                                modifier = Modifier.padding(vertical = 10.dp, horizontal = 12.dp),
                            )
                        }
                    }
                }
            }
        }

        if (activeTab == "clasament") {
            // 4 Monthly Awards Cards
            item {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(horizontal = 16.dp)
                ) {
                    Text(
                        text = "Premiile lunii în Timișoara",
                        style = MaterialTheme.typography.titleLarge,
                        color = colors.onBackground,
                    )
                    val rising = top10Venues.find { it.isRisingStar == true } ?: top10Venues.firstOrNull()
                    val bestEmployeeVenue = top10Venues.firstOrNull { it.team.any { m -> m.isEmployeeOfMonth == true } }
                    val bestEmployee = bestEmployeeVenue?.team?.firstOrNull { it.isEmployeeOfMonth == true }
                    val topLocal = state.topReviewers.firstOrNull { it.role == "verified-local" }
                    val topInf = state.topReviewers.firstOrNull { it.role == "influencer" }

                    AwardCard(
                        badge = "Revelația lunii",
                        title = awards?.revelation?.name ?: rising?.name ?: "Restaurant Nora",
                        subtitle = if (awards?.revelation != null) {
                            "Urcare de la ${DomainLogic.formatScore(awards.revelation.from)} la ${DomainLogic.formatScore(awards.revelation.to)}"
                        } else {
                            rising?.monthlyStatusLabel ?: "Cea mai mare creștere organică din luna curentă"
                        },
                        onClick = { (awards?.revelation?.slug ?: rising?.slug)?.let(onOpenVenue) },
                    )
                    AwardCard(
                        badge = "Angajatul lunii",
                        title = awards?.employee?.let { "${it.firstName} · ${it.venue}" }
                            ?: bestEmployee?.let { "${it.name} (${it.role}) · ${bestEmployeeVenue?.name}" }
                            ?: "Ioana · Restaurant Nora",
                        subtitle = "${awards?.employee?.mentions ?: bestEmployee?.positiveMentions ?: 23} mențiuni pozitive de la localnici",
                        onClick = { (awards?.employee?.venueSlug ?: bestEmployeeVenue?.slug)?.let(onOpenVenue) },
                    )
                    AwardCard(
                        badge = "Localnicul lunii",
                        title = awards?.local?.displayName ?: topLocal?.name ?: "Andreea M.",
                        subtitle = "${awards?.local?.reviews ?: topLocal?.helpfulVotes ?: 340} contribuții apreciate · pondere 2,0×",
                    )
                    AwardCard(
                        badge = "Influencerul lunii",
                        title = awards?.influencer?.displayName ?: topInf?.name ?: "Tm Food Vlog",
                        subtitle = "${topInf?.badgeLabel ?: "Parteneriat transparent"} · ${topInf?.helpfulVotes ?: 190} voturi utile",
                    )
                }
            }

            // Official Top 10 List
            item {
                Text(
                    text = "Top 10 Onest · ${formatMonthRo(state.selectedMonth)}",
                    style = MaterialTheme.typography.titleLarge,
                    color = colors.onBackground,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                )
            }

            itemsIndexed(top10Venues, key = { _, v -> v.id }) { idx, venue ->
                val rank = venue.monthlyRank ?: (idx + 1)
                val change = venue.monthlyRankChange ?: 0
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = colors.surface,
                    border = BorderStroke(1.dp, colors.border),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clickable { onOpenVenue(venue.slug) }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(12.dp)
                    ) {
                        if (rank <= 3) {
                            TrophyMedalBadge(rank = rank, compact = true)
                        } else {
                            Text(
                                text = "#$rank",
                                style = MaterialTheme.typography.titleMedium,
                                color = colors.onSurfaceMuted,
                                modifier = Modifier.width(28.dp),
                            )
                        }
                        NetworkVenueImage(
                            url = venue.photoUrl,
                            contentDescription = venue.name,
                            modifier = Modifier
                                .size(56.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .border(1.dp, colors.border, RoundedCornerShape(4.dp)),
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = venue.name,
                                style = MaterialTheme.typography.titleMedium,
                                color = colors.onBackground,
                            )
                            Text(
                                text = "${venue.shortNeighborhood ?: venue.neighborhood} · ${venue.cuisine}",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onSurfaceMuted,
                            )
                            Text(
                                text = venue.monthlyStatusLabel ?: when {
                                    venue.isRisingStar == true -> "Nou în top · creștere rapidă"
                                    change > 0 -> "▲ +$change locuri față de luna trecută"
                                    change < 0 -> "▼ $change locuri față de luna trecută"
                                    else -> "= poziție stabilă"
                                },
                                style = MaterialTheme.typography.labelSmall,
                                color = if (change > 0 || venue.isRisingStar == true) colors.localnicBg else colors.onSurfaceMuted,
                            )
                        }
                        ScoreBadge(score = venue.monthlyScore ?: venue.foodQualityScore, isDrink = isDrink)
                    }
                }
            }
        } else {
            // Public Category Voting Tab
            item {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = colors.surfaceElevated,
                    border = BorderStroke(1.dp, colors.border),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (isVotingOpen) Icons.Filled.Star else Icons.Filled.Lock,
                                contentDescription = null,
                                tint = colors.primary,
                                modifier = Modifier.size(16.dp),
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                text = if (isVotingOpen) {
                                    "Vot deschis · 1 vot per categorie pe lună"
                                } else {
                                    "Arhivă vot · Voturile pentru ${formatMonthRo(state.selectedMonth)} s-au încheiat"
                                },
                                style = MaterialTheme.typography.titleMedium,
                                color = colors.onBackground,
                            )
                        }
                        if (state.currentUser == null && isVotingOpen) {
                            OutlinedButton(onClick = onOpenLogin) {
                                Text("Intră în cont pentru a vota")
                            }
                        }
                    }
                }
            }

            if (computedCategories.size > 1) {
                item {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        item {
                            FilterChip(
                                selected = selectedCategoryId == "all",
                                onClick = { selectedCategoryId = "all" },
                                label = { Text("Toate categoriile", style = MaterialTheme.typography.bodySmall) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = colors.primary,
                                    selectedLabelColor = colors.onPrimary,
                                    containerColor = colors.surface,
                                    labelColor = colors.onBackground,
                                ),
                            )
                        }
                        items(computedCategories, key = { it.id }) { cat ->
                            FilterChip(
                                selected = selectedCategoryId == cat.id,
                                onClick = { selectedCategoryId = cat.id },
                                label = { Text(cat.shortLabel, style = MaterialTheme.typography.bodySmall) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = colors.primary,
                                    selectedLabelColor = colors.onPrimary,
                                    containerColor = colors.surface,
                                    labelColor = colors.onBackground,
                                ),
                            )
                        }
                    }
                }
            }

            val displayedCats = if (selectedCategoryId == "all") {
                computedCategories
            } else {
                computedCategories.filter { it.id == selectedCategoryId }
            }

            items(displayedCats, key = { it.id }) { cat ->
                val myVotedSlug = myVotesByCat[cat.id]
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
                        modifier = Modifier.padding(14.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = cat.title,
                                style = MaterialTheme.typography.titleLarge,
                                color = colors.onBackground,
                            )
                            Text(
                                text = "${cat.totalVotes} voturi",
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.onSurfaceMuted,
                            )
                        }

                        cat.allNominees.take(6).forEach { nominee ->
                            val isMyVote = myVotedSlug == nominee.candidateSlug
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (isMyVote) colors.primary.copy(alpha = 0.12f) else colors.surfaceElevated,
                                border = BorderStroke(
                                    width = if (isMyVote) 1.5.dp else 1.dp,
                                    color = if (isMyVote) colors.primary else colors.border,
                                ),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.padding(10.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clickable(enabled = nominee.venueSlug != null) {
                                                    nominee.venueSlug?.let(onOpenVenue)
                                                }
                                        ) {
                                            Text(
                                                text = "#${nominee.rank} ${nominee.venueName}",
                                                style = MaterialTheme.typography.titleMedium,
                                                color = colors.onBackground,
                                            )
                                            Text(
                                                text = "${nominee.dishHighlight} · ${nominee.neighborhood}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = colors.onSurfaceMuted,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                            )
                                        }
                                        Spacer(Modifier.width(8.dp))
                                        if (isVotingOpen && myVotedSlug == null) {
                                            Button(
                                                onClick = {
                                                    onCastMonthlyVote(cat.id, nominee.candidateSlug, nominee.venueName)
                                                },
                                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = colors.primary,
                                                    contentColor = colors.onPrimary,
                                                ),
                                                modifier = Modifier.height(32.dp)
                                            ) {
                                                Text("Votează", style = MaterialTheme.typography.labelSmall)
                                            }
                                        } else if (isMyVote) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Filled.Check, contentDescription = null, tint = colors.primary, modifier = Modifier.size(16.dp))
                                                Spacer(Modifier.width(4.dp))
                                                Text("Votat", style = MaterialTheme.typography.labelSmall, color = colors.primary)
                                            }
                                        } else {
                                            Text(
                                                text = "${nominee.voteSharePct}%",
                                                style = MaterialTheme.typography.labelMedium,
                                                color = colors.onBackground,
                                            )
                                        }
                                    }

                                    // Vote Share Bar
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(6.dp)
                                                .clip(RoundedCornerShape(3.dp))
                                                .background(colors.border.copy(alpha = 0.6f))
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth((nominee.voteSharePct / 100f).coerceIn(0.03f, 1f))
                                                    .fillMaxHeight()
                                                    .clip(RoundedCornerShape(3.dp))
                                                    .background(if (nominee.rank == 1) colors.primary else colors.secondary)
                                            )
                                        }
                                        Text(
                                            text = "${nominee.votes} (${nominee.voteSharePct}%)",
                                            style = MaterialTheme.typography.labelSmall,
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
}

@Composable
private fun AwardCard(
    badge: String,
    title: String,
    subtitle: String,
    onClick: (() -> Unit)? = null,
) {
    val colors = LocalTopFoodColors.current
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, colors.border),
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(12.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = colors.warning.copy(alpha = 0.2f),
                contentColor = if (colors.isDark) colors.warning else colors.onWarning,
            ) {
                Text(
                    text = badge,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, style = MaterialTheme.typography.titleMedium, color = colors.onBackground)
                Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = colors.onSurfaceMuted)
            }
        }
    }
}
