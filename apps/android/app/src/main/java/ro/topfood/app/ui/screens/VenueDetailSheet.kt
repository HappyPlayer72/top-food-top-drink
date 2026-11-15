package ro.topfood.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Create
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import ro.topfood.app.data.model.DomainLogic
import ro.topfood.app.data.model.Restaurant
import ro.topfood.app.data.model.Review
import ro.topfood.app.data.model.ReviewQuestionSpec
import ro.topfood.app.data.model.UserAccount
import ro.topfood.app.ui.components.AvertizareaCard
import ro.topfood.app.ui.components.CrowdMeter
import ro.topfood.app.ui.components.EmployeeEcusonCard
import ro.topfood.app.ui.components.InfluencerBadge
import ro.topfood.app.ui.components.LocalVsTouristBars
import ro.topfood.app.ui.components.LocalnicBadge
import ro.topfood.app.ui.components.NetworkVenueImage
import ro.topfood.app.ui.components.PartnerBadge
import ro.topfood.app.ui.components.ScoreBadge
import ro.topfood.app.ui.components.SponsoredPill
import ro.topfood.app.ui.components.TrapBadge
import ro.topfood.app.ui.components.TrophyMedalBadge
import ro.topfood.app.ui.components.TuristBadge
import ro.topfood.app.ui.theme.CondensedDisplayFontFamily
import ro.topfood.app.ui.theme.LocalTopFoodColors
import kotlin.math.roundToInt

private enum class ReviewFilterTab(val label: String) {
    ALL("Toate"),
    LOCALS("Localnici"),
    TOURISTS("Turiști"),
    INFLUENCERS("Influenceri"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VenueDetailSheet(
    venue: Restaurant,
    isSaved: Boolean,
    currentUser: UserAccount?,
    questions: List<ReviewQuestionSpec>,
    onClose: () -> Unit,
    onToggleSave: (String) -> Unit,
    onLocateOnMap: (Restaurant) -> Unit,
    onSubmitReview: (
        venue: Restaurant,
        foodScore: Int,
        trapEstimatePct: Int,
        text: String,
        praisedEmployee: String?,
        safetyScore: Int?,
        noiseLevel: String?,
        answers: Map<String, String>,
        gpsVerified: Boolean,
    ) -> Unit,
    onEditOwnReview: (venue: Restaurant, reviewId: String, newScore: Double, newText: String) -> Unit,
    onDeleteOwnReview: (venue: Restaurant, reviewId: String) -> Unit,
    onVoteHelpful: (venue: Restaurant, review: Review) -> Unit,
    onReportCrowd: (venue: Restaurant, segments: Int, label: String) -> Unit,
    onCastQuickVote: (venue: Restaurant, kind: String, value: Int) -> Unit,
    onSubmitVideo: (venue: Restaurant, url: String) -> Unit,
    onOpenLogin: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    val context = LocalContext.current
    val isDrink = venue.vertical == "drink"

    var selectedReviewTab by remember { mutableStateOf(ReviewFilterTab.ALL) }
    var videoUrlInput by remember { mutableStateOf("") }
    var showReviewComposer by remember { mutableStateOf(false) }
    var editingReview by remember { mutableStateOf<Review?>(null) }

    val filteredReviews = remember(venue.reviews, selectedReviewTab) {
        when (selectedReviewTab) {
            ReviewFilterTab.ALL -> venue.reviews
            ReviewFilterTab.LOCALS -> venue.reviews.filter { it.authorRole == "verified-local" }
            ReviewFilterTab.TOURISTS -> venue.reviews.filter { it.authorRole == "tourist" || it.authorRole == "regular" }
            ReviewFilterTab.INFLUENCERS -> venue.reviews.filter { it.authorRole == "influencer" }
        }
    }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = colors.background,
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                val verticalSlug = if (isDrink) "topdrink" else "topfood"
                var showMethodology by remember { mutableStateOf(false) }

                // Website-matched breadcrumb navigation bar (< topfood/timisoara/{slug}  [Save] [Share] [Hartă])
                Surface(
                    color = colors.background,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable(onClick = onClose)
                                    .padding(vertical = 4.dp),
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.ArrowBack,
                                    contentDescription = "Înapoi",
                                    tint = colors.onBackground,
                                    modifier = Modifier.size(18.dp),
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "$verticalSlug/timisoara/${venue.slug}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.onSurfaceMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            IconButton(
                                onClick = { onToggleSave(venue.slug) },
                                modifier = Modifier.size(36.dp),
                            ) {
                                Icon(
                                    imageVector = if (isSaved) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                                    contentDescription = if (isSaved) "Salvat" else "Salvează",
                                    tint = if (isSaved) colors.primary else colors.onSurfaceMuted,
                                    modifier = Modifier.size(19.dp),
                                )
                            }
                            IconButton(
                                onClick = {
                                    val shareText = "${venue.name} (${venue.neighborhood}) · Scor onest ${DomainLogic.formatScore(venue.foodQualityScore)}/10 · https://topfood.ro/$verticalSlug/timisoara/${venue.slug}"
                                    val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                        action = Intent.ACTION_SEND
                                        putExtra(Intent.EXTRA_TEXT, shareText)
                                        type = "text/plain"
                                    }
                                    context.startActivity(Intent.createChooser(sendIntent, "Distribuie localul"))
                                },
                                modifier = Modifier.size(36.dp),
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Share,
                                    contentDescription = "Distribuie",
                                    tint = colors.onSurfaceMuted,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = colors.surfaceElevated,
                                border = BorderStroke(1.dp, colors.inputBorder),
                                modifier = Modifier.clickable { onLocateOnMap(venue) },
                            ) {
                                Text(
                                    text = "Hartă",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = colors.onBackground,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                )
                            }
                        }
                        Divider(color = colors.border, thickness = 1.dp)
                    }
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    // Venue Hero Photography (192.dp, 4.dp radius)
                    item {
                        NetworkVenueImage(
                            url = venue.photoUrl,
                            contentDescription = venue.name,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(192.dp)
                                .clip(RoundedCornerShape(4.dp)),
                        )
                    }

                    // Towering Title + Large PlateScore / MugScore Header
                    item {
                        Surface(
                            color = colors.surface,
                            shape = RoundedCornerShape(4.dp),
                            border = BorderStroke(1.dp, colors.border),
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.Top,
                                ) {
                                    Column(
                                        verticalArrangement = Arrangement.spacedBy(4.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .padding(end = 12.dp),
                                    ) {
                                        Text(
                                            text = venue.name,
                                            fontFamily = CondensedDisplayFontFamily,
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 30.sp,
                                            lineHeight = 31.sp,
                                            color = colors.onBackground,
                                        )
                                        Text(
                                            text = "${venue.cuisine}, ${venue.neighborhood}, ${venue.priceTier}${if (venue.hours.isNotBlank()) " · ${venue.hours}" else ""}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = colors.onSurfaceMuted,
                                        )
                                        val deliveryText = if (venue.delivery?.available == true) {
                                            val plats = venue.delivery.platforms.joinToString(", ").ifBlank { "disponibilă" }
                                            "Livrare ($plats)"
                                        } else {
                                            "La masă"
                                        }
                                        Text(
                                            text = "Actualizat: ${venue.lastUpdated ?: "noiembrie 2026"} · ${if (venue.openNow) "Deschis acum" else "Închis"} · $deliveryText",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = colors.onSurfaceMuted,
                                        )
                                    }

                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        ScoreBadge(
                                            score = venue.foodQualityScore,
                                            isDrink = isDrink,
                                            large = true,
                                        )
                                        Spacer(modifier = Modifier.height(3.dp))
                                        Text(
                                            text = "Cum calculăm?",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = colors.primary,
                                            textDecoration = TextDecoration.Underline,
                                            modifier = Modifier.clickable { showMethodology = !showMethodology },
                                        )
                                    }
                                }

                                if (showMethodology) {
                                    Surface(
                                        shape = RoundedCornerShape(4.dp),
                                        color = colors.surfaceElevated,
                                        border = BorderStroke(1.dp, colors.border),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Text(
                                            text = "Scorul Onest ponderează localnicii verificați cu 2,0× (×1,3 pentru vizite verificate), turiștii cu 1,0× și parteneriatele plătite cu 0,2×.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = colors.onSurfaceMuted,
                                            modifier = Modifier.padding(10.dp),
                                        )
                                    }
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    TrapBadge(trapIndex = venue.touristTrapIndex)
                                    if (venue.isPartner) {
                                        PartnerBadge(isDrink = isDrink)
                                    }
                                    if (venue.monthlyRank != null && venue.monthlyRank in 1..3) {
                                        TrophyMedalBadge(rank = venue.monthlyRank, label = "Top lunar", compact = true)
                                    }
                                    if (venue.isSponsored) {
                                        SponsoredPill()
                                    }
                                }

                                if (venue.editorialHeadline.isNotBlank()) {
                                    Text(
                                        text = venue.editorialHeadline,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = colors.onBackground,
                                    )
                                }

                                val priceNote = buildString {
                                    append(venue.priceTier)
                                    if (venue.avgMealPriceRon > 0) {
                                        append(" · ~${DomainLogic.formatRon(venue.avgMealPriceRon)}/pers")
                                    }
                                    venue.priceRangeLabel?.takeIf { it.isNotBlank() }?.let {
                                        append(" · $it")
                                    }
                                }
                                Text(
                                    text = priceNote,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.onSurfaceMuted,
                                )

                                LocalVsTouristBars(
                                    localsScore = venue.localsScore,
                                    touristsScore = venue.touristsScore,
                                    googleRawRating = venue.googleRawRating,
                                )
                            }
                        }
                    }

                    // Action Buttons Row
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            item {
                                Button(
                                    onClick = {
                                        if (currentUser == null) {
                                            onOpenLogin()
                                        } else {
                                            showReviewComposer = true
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = colors.primary,
                                        contentColor = colors.onPrimary,
                                    ),
                                ) {
                                    Icon(Icons.Filled.Create, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Scrie review")
                                }
                            }
                            item {
                                OutlinedButton(onClick = { onLocateOnMap(venue) }) {
                                    Icon(Icons.Filled.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Pe hartă")
                                }
                            }
                            item {
                                OutlinedButton(onClick = {
                                    val geoUri = Uri.parse(
                                        "geo:${venue.coordinates.lat},${venue.coordinates.lng}?q=${Uri.encode("${venue.name}, Timișoara")}"
                                    )
                                    val mapIntent = Intent(Intent.ACTION_VIEW, geoUri)
                                    if (mapIntent.resolveActivity(context.packageManager) != null) {
                                        context.startActivity(mapIntent)
                                    }
                                }) {
                                    Icon(Icons.Filled.Place, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Google Maps")
                                }
                            }
                            if (venue.phone.isNotBlank()) {
                                item {
                                    OutlinedButton(onClick = {
                                        val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${venue.phone}"))
                                        if (dialIntent.resolveActivity(context.packageManager) != null) {
                                            context.startActivity(dialIntent)
                                        }
                                    }) {
                                        Icon(Icons.Filled.Call, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Sună")
                                    }
                                }
                            }
                        }
                    }

                    // Tourist Trap Alert Card (Rule #5: explicit trapReasons)
                    if (venue.trapReasons.isNotEmpty() || venue.touristTrapIndex >= DomainLogic.POSSIBLE_TRAP_THRESHOLD) {
                        item {
                            AvertizareaCard(
                                trapIndex = venue.touristTrapIndex,
                                reasons = venue.trapReasons,
                                venueName = venue.name,
                                subtitle = "${venue.shortCategory ?: venue.cuisine} · ${venue.shortNeighborhood ?: venue.neighborhood}",
                                breakdown = venue.trapBreakdown,
                            )
                        }
                    }

                    // 5-Signal TrapBreakdown
                    venue.trapBreakdown?.let { tb ->
                        item {
                            SectionCard(title = "Analiză Capcană Turistică (5 semnale)") {
                                MetricRow("Diferență turiști vs. localnici", "${"%.1f".format(tb.touristVsLocalGap)} pct")
                                MetricRow("Proximitate zonă turistică", "${tb.touristZoneProximityM} m")
                                val priceDiffSign = if (tb.priceVsCategoryPct >= 0) "+" else ""
                                MetricRow("Preț față de media categoriei", "$priceDiffSign${tb.priceVsCategoryPct}%")
                                MetricRow("Recenzii în limbi străine", "${tb.foreignLangReviewsPct}%")
                                MetricRow("Vizitatori o singură dată", "${tb.singleVisitPct}%")
                            }
                        }
                    }

                    // 4 Aspect Scores
                    venue.aspectScores?.let { scores ->
                        item {
                            SectionCard(title = "Note pe criterii") {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    AspectCell(
                                        label = if (isDrink) "Băuturi" else "Mâncare",
                                        value = scores.food,
                                        modifier = Modifier.weight(1f),
                                    )
                                    AspectCell(
                                        label = "Servire",
                                        value = scores.service,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    AspectCell(
                                        label = "Preț / Calitate",
                                        value = scores.value,
                                        modifier = Modifier.weight(1f),
                                    )
                                    AspectCell(
                                        label = "Atmosferă",
                                        value = scores.atmosphere,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            }
                        }
                    }

                    // TopDrink Live CrowdMeter + Crowd Reporting
                    if (isDrink || venue.crowdSegments != null) {
                        item {
                            val currentSegments = venue.crowdSegments ?: 3
                            SectionCard(title = "Atmosferă & aglomerație live") {
                                CrowdMeter(segments = currentSegments, label = venue.crowdLabel)
                                Text(
                                    text = "Raportează cum e acum:",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = colors.onSurfaceMuted,
                                )
                                val crowdLabels = listOf(
                                    1 to "1 · Liniștit",
                                    2 to "2 · Relaxat",
                                    3 to "3 · Animație",
                                    4 to "4 · Plin",
                                    5 to "5 · Coadă",
                                )
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    items(crowdLabels) { (seg, label) ->
                                        FilterChip(
                                            selected = currentSegments == seg,
                                            onClick = { onReportCrowd(venue, seg, label.substringAfter("· ")) },
                                            label = { Text(label) },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = colors.primary,
                                                selectedLabelColor = colors.onPrimary,
                                            ),
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Quick Votes (Safety 1..5 & Noise 1..4)
                    item {
                        SectionCard(title = "Vot rapid · Siguranță și Zgomot") {
                            val safetyText = venue.quick?.safetyAvg?.let {
                                "${"%.1f".format(it)}/5 (${venue.quick.safetyCount ?: 0} voturi)"
                            } ?: "Fără voturi încă"
                            MetricRow("Siguranță percepută", safetyText)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                (1..5).forEach { score ->
                                    OutlinedButton(
                                        onClick = { onCastQuickVote(venue, "safety", score) },
                                        modifier = Modifier.weight(1f),
                                        contentPadding = PaddingValues(vertical = 4.dp),
                                    ) {
                                        Text("$score")
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(4.dp))
                            val noiseText = venue.quick?.noiseMode?.let {
                                "$it (${venue.quick.noiseCount ?: 0} voturi)"
                            } ?: "Nespecificat"
                            MetricRow("Nivel zgomot", noiseText)
                            val noiseLevels = listOf(
                                1 to "Liniștit",
                                2 to "Moderat",
                                3 to "Zgomotos",
                                4 to "Tare",
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                noiseLevels.forEach { (lvl, label) ->
                                    OutlinedButton(
                                        onClick = { onCastQuickVote(venue, "noise", lvl) },
                                        modifier = Modifier.weight(1f),
                                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp),
                                    ) {
                                        Text(
                                            text = label,
                                            style = MaterialTheme.typography.labelSmall,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Warnings, Facilities & Delivery
                    val warnings = venue.warnings
                    val hasWarnings = warnings != null && (
                        !warnings.unsafeFeeling.isNullOrBlank() ||
                            !warnings.veryNoisy.isNullOrBlank() ||
                            !warnings.brightLights.isNullOrBlank()
                        )
                    if (hasWarnings) {
                        item {
                            SectionCard(title = "Atenționări din comunitate") {
                                warnings?.unsafeFeeling?.takeIf { it.isNotBlank() }?.let {
                                    WarningLine("Siguranță: $it")
                                }
                                warnings?.veryNoisy?.takeIf { it.isNotBlank() }?.let {
                                    WarningLine("Zgomot: $it")
                                }
                                warnings?.brightLights?.takeIf { it.isNotBlank() }?.let {
                                    WarningLine("Lumină puternică: $it")
                                }
                            }
                        }
                    }

                    val facilities = venue.facilities
                    val disability = facilities?.disabilityLabel()
                    if (facilities != null && (disability != null || facilities.hasOutlets == true || facilities.otherFacilities.isNotEmpty())) {
                        item {
                            SectionCard(title = "Facilități") {
                                disability?.let { MetricRow("Accesibilitate", it) }
                                if (facilities.hasOutlets == true) {
                                    MetricRow("Prize", "Disponibile la mese")
                                }
                                facilities.otherFacilities.forEach { facility ->
                                    Text(
                                        text = "• $facility",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.onBackground,
                                    )
                                }
                            }
                        }
                    }

                    venue.delivery?.let { del ->
                        if (del.available || del.platforms.isNotEmpty() || !del.note.isNullOrBlank()) {
                            item {
                                SectionCard(title = "Livrare") {
                                    MetricRow("Livrare disponibilă", if (del.available) "Da" else "Doar ridicare / la local")
                                    if (del.platforms.isNotEmpty()) {
                                        MetricRow("Platforme", del.platforms.joinToString(", "))
                                    }
                                    if (del.ownDelivery == true) {
                                        MetricRow("Livrare proprie", "Da")
                                    }
                                    del.minimumOrderRon?.let {
                                        MetricRow("Comandă minimă", "${DomainLogic.formatRon(it)} lei")
                                    }
                                    del.estimatedTime?.takeIf { it.isNotBlank() }?.let {
                                        MetricRow("Timp estimat", it)
                                    }
                                    del.note?.takeIf { it.isNotBlank() }?.let {
                                        Text(
                                            text = it,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = colors.onSurfaceMuted,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Editorial Writeup
                    if (venue.editorialWriteup.isNotEmpty()) {
                        item {
                            SectionCard(title = "Verdict editorial TopFood") {
                                venue.editorialWriteup.forEach { para ->
                                    Text(
                                        text = para,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = colors.onBackground,
                                    )
                                }
                            }
                        }
                    }

                    // What To Order
                    if (venue.whatToOrder.isNotEmpty()) {
                        item {
                            SectionCard(title = if (isDrink) "Ce merită comandat la bar" else "De încercat neapărat") {
                                venue.whatToOrder.forEach { dish ->
                                    Surface(
                                        color = colors.surfaceElevated,
                                        shape = MaterialTheme.shapes.small,
                                        border = BorderStroke(1.dp, colors.border),
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Row(
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                ) {
                                                    Text(
                                                        text = dish.name,
                                                        style = MaterialTheme.typography.titleSmall,
                                                        color = colors.onBackground,
                                                    )
                                                    if (dish.isMustOrder) {
                                                        Surface(
                                                            color = colors.primary.copy(alpha = 0.14f),
                                                            shape = RoundedCornerShape(3.dp),
                                                        ) {
                                                            Text(
                                                                text = "MUST",
                                                                style = MaterialTheme.typography.labelSmall,
                                                                color = colors.primary,
                                                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                                                            )
                                                        }
                                                    }
                                                }
                                                dish.description?.takeIf { it.isNotBlank() }?.let { desc ->
                                                    Text(
                                                        text = desc,
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = colors.onSurfaceMuted,
                                                    )
                                                }
                                            }
                                            if (dish.priceRon > 0) {
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    text = "${DomainLogic.formatRon(dish.priceRon)} lei",
                                                    style = MaterialTheme.typography.labelLarge,
                                                    color = colors.primary,
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Categorized Menu
                    if (venue.menuCategories.isNotEmpty()) {
                        item {
                            SectionCard(title = "Meniu complet") {
                                venue.menuCategories.forEachIndexed { catIdx, cat ->
                                    if (catIdx > 0) {
                                        Divider(color = colors.border, modifier = Modifier.padding(vertical = 4.dp))
                                    }
                                    Text(
                                        text = cat.title,
                                        style = MaterialTheme.typography.titleSmall,
                                        color = colors.primary,
                                    )
                                    cat.items.forEach { item ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.Top,
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                val itemTitle = if (!item.portion.isNullOrBlank()) {
                                                    "${item.name} (${item.portion})"
                                                } else {
                                                    item.name
                                                }
                                                Text(
                                                    text = itemTitle,
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    fontWeight = if (item.isMustOrder) FontWeight.Bold else FontWeight.Medium,
                                                    color = colors.onBackground,
                                                )
                                                item.description?.takeIf { it.isNotBlank() }?.let {
                                                    Text(
                                                        text = it,
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = colors.onSurfaceMuted,
                                                    )
                                                }
                                            }
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "${DomainLogic.formatRon(item.priceRon)} lei",
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.SemiBold,
                                                color = colors.onBackground,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Kitchen Story
                    venue.kitchenStory?.let { story ->
                        item {
                            SectionCard(title = "Poveste din bucătărie") {
                                Text(
                                    text = story.title,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = colors.onBackground,
                                )
                                Text(
                                    text = "${story.author} · ${story.date}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.onSurfaceMuted,
                                )
                                Text(
                                    text = story.body,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = colors.onBackground,
                                )
                            }
                        }
                    }

                    // Owner Posts
                    if (venue.ownerPosts.isNotEmpty()) {
                        item {
                            SectionCard(title = "Anunțuri de la local") {
                                venue.ownerPosts.forEach { post ->
                                    Surface(
                                        color = colors.surfaceElevated,
                                        shape = MaterialTheme.shapes.small,
                                        border = BorderStroke(1.dp, colors.border),
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(10.dp),
                                            verticalArrangement = Arrangement.spacedBy(4.dp),
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                            ) {
                                                Text(
                                                    text = post.title,
                                                    style = MaterialTheme.typography.titleSmall,
                                                    color = colors.onBackground,
                                                    modifier = Modifier.weight(1f),
                                                )
                                                Text(
                                                    text = post.date,
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = colors.onSurfaceMuted,
                                                )
                                            }
                                            Text(
                                                text = post.content,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = colors.onBackground,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Team (EmployeeEcusonCard)
                    if (venue.team.isNotEmpty()) {
                        item {
                            SectionCard(title = "Echipa lăudată de clienți") {
                                venue.team.forEach { member ->
                                    EmployeeEcusonCard(member = member)
                                }
                            }
                        }
                    }

                    // Videos + Submit Video URL
                    item {
                        SectionCard(title = "Video-uri TikTok / Instagram / YouTube") {
                            if (venue.videos.isEmpty()) {
                                Text(
                                    text = "Niciun video analizat încă. Poți trimite un link mai jos.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.onSurfaceMuted,
                                )
                            } else {
                                venue.videos.forEach { vid ->
                                    Surface(
                                        color = colors.surfaceElevated,
                                        shape = MaterialTheme.shapes.small,
                                        border = BorderStroke(1.dp, colors.border),
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(10.dp),
                                            verticalArrangement = Arrangement.spacedBy(4.dp),
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                            ) {
                                                Text(
                                                    text = vid.platform.uppercase(),
                                                    style = MaterialTheme.typography.labelMedium,
                                                    color = colors.primary,
                                                )
                                                Text(
                                                    text = if (vid.isPaid) "Parteneriat plătit" else "Organic · ${vid.sentiment}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = if (vid.isPaid) colors.warning else colors.localnicBg,
                                                )
                                            }
                                            Text(
                                                text = vid.url,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = colors.onSurfaceMuted,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                            )
                                            if (vid.dishes.isNotEmpty()) {
                                                Text(
                                                    text = "Preparate menționate: ${vid.dishes.joinToString(", ")}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = colors.onBackground,
                                                )
                                            }
                                            if (vid.prices.isNotEmpty()) {
                                                Text(
                                                    text = "Prețuri video: " + vid.prices.joinToString(", ") {
                                                        "${it.item} (${DomainLogic.formatRon(it.priceLei)} lei)"
                                                    },
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = colors.onSurfaceMuted,
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                OutlinedTextField(
                                    value = videoUrlInput,
                                    onValueChange = { videoUrlInput = it },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                    placeholder = { Text("https://tiktok.com/...") },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = colors.primary,
                                        unfocusedBorderColor = colors.inputBorder,
                                        focusedTextColor = colors.onBackground,
                                        unfocusedTextColor = colors.onBackground,
                                    ),
                                )
                                Button(
                                    onClick = {
                                        if (videoUrlInput.isNotBlank()) {
                                            onSubmitVideo(venue, videoUrlInput)
                                            videoUrlInput = ""
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = colors.primary,
                                        contentColor = colors.onPrimary,
                                    ),
                                ) {
                                    Icon(Icons.Filled.Send, contentDescription = "Trimite video", modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }

                    // Hours & Contact
                    item {
                        SectionCard(title = "Program și adresă") {
                            MetricRow("Adresă", venue.address)
                            if (venue.phone.isNotBlank()) {
                                MetricRow("Telefon", venue.phone)
                            }
                            if (venue.hours.isNotBlank()) {
                                MetricRow("Program general", venue.hours)
                            }
                            venue.weeklyHours.forEach { wh ->
                                MetricRow(wh.day, wh.hours)
                            }
                        }
                    }

                    // Reviews Header + Filter Tabs
                    item {
                        val counts = venue.reviewCounts
                        val countSummary = if (counts != null) {
                            "${venue.reviews.size} recenzii · ${counts.locals} localnici · ${counts.tourists} turiști · ${counts.influencers} influenceri"
                        } else {
                            "${venue.reviews.size} recenzii"
                        }
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Recenzii ponderate",
                                        style = MaterialTheme.typography.titleLarge,
                                        color = colors.onBackground,
                                    )
                                    Text(
                                        text = countSummary,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.onSurfaceMuted,
                                    )
                                }
                                Button(
                                    onClick = {
                                        if (currentUser == null) onOpenLogin() else showReviewComposer = true
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = colors.primary,
                                        contentColor = colors.onPrimary,
                                    ),
                                ) {
                                    Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Review")
                                }
                            }

                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(ReviewFilterTab.entries) { tab ->
                                    FilterChip(
                                        selected = selectedReviewTab == tab,
                                        onClick = { selectedReviewTab = tab },
                                        label = { Text(tab.label) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = colors.primary,
                                            selectedLabelColor = colors.onPrimary,
                                        ),
                                    )
                                }
                            }
                        }
                    }

                    // Reviews List
                    if (filteredReviews.isEmpty()) {
                        item {
                            Surface(
                                color = colors.surface,
                                shape = MaterialTheme.shapes.medium,
                                border = BorderStroke(1.dp, colors.border),
                            ) {
                                Text(
                                    text = "Nu există recenzii în această categorie încă.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = colors.onSurfaceMuted,
                                    modifier = Modifier.padding(16.dp),
                                )
                            }
                        }
                    } else {
                        items(filteredReviews, key = { it.id ?: "${it.authorName}-${it.date}-${it.text.hashCode()}" }) { review ->
                            val isOwnReview = currentUser != null && (
                                (!review.authorId.isNullOrBlank() && review.authorId == currentUser.id) ||
                                    review.authorName.equals(currentUser.name, ignoreCase = true)
                                )
                            ReviewItemCard(
                                review = review,
                                isDrink = isDrink,
                                isOwnReview = isOwnReview,
                                onVoteHelpful = { onVoteHelpful(venue, review) },
                                onEdit = { editingReview = review },
                                onDelete = { review.id?.let { onDeleteOwnReview(venue, it) } },
                            )
                        }
                    }

                    item { Spacer(modifier = Modifier.height(24.dp)) }
                }
            }
        }
    }

    if (showReviewComposer) {
        ReviewComposerDialog(
            venueName = venue.name,
            questions = questions.take(4),
            onDismiss = { showReviewComposer = false },
            onSubmit = { score, trapPct, text, employee, safety, noise, answers, gps ->
                onSubmitReview(venue, score, trapPct, text, employee, safety, noise, answers, gps)
                showReviewComposer = false
            },
        )
    }

    editingReview?.let { target ->
        EditReviewDialog(
            initialScore = target.foodScore,
            initialText = target.text,
            onDismiss = { editingReview = null },
            onConfirm = { newScore, newText ->
                target.id?.let { id ->
                    onEditOwnReview(venue, id, newScore, newText)
                }
                editingReview = null
            },
        )
    }
}

@Composable
private fun SectionCard(
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
            verticalArrangement = Arrangement.spacedBy(8.dp),
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

@Composable
private fun MetricRow(label: String, value: String) {
    val colors = LocalTopFoodColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = colors.onSurfaceMuted,
            modifier = Modifier.weight(1f),
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
            color = colors.onBackground,
        )
    }
}

@Composable
private fun AspectCell(
    label: String,
    value: Double,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    Surface(
        modifier = modifier,
        color = colors.surfaceElevated,
        shape = MaterialTheme.shapes.small,
        border = BorderStroke(1.dp, colors.border),
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = colors.onSurfaceMuted,
            )
            Text(
                text = "${DomainLogic.formatScore(value)} / 10",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = colors.primary,
            )
        }
    }
}

@Composable
private fun WarningLine(text: String) {
    val colors = LocalTopFoodColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.Warning,
            contentDescription = null,
            tint = colors.warning,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = colors.onBackground,
        )
    }
}

@Composable
private fun ReviewItemCard(
    review: Review,
    isDrink: Boolean,
    isOwnReview: Boolean,
    onVoteHelpful: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
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
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = review.authorName,
                        style = MaterialTheme.typography.titleSmall,
                        color = colors.onBackground,
                    )
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        item {
                            when (review.authorRole) {
                                "verified-local" -> LocalnicBadge(neighborhood = review.authorNeighborhood)
                                "influencer" -> InfluencerBadge(
                                    followers = review.followerCountText,
                                    isPaid = review.isPaidCollab != false,
                                )
                                else -> TuristBadge()
                            }
                        }
                        if (review.isVerifiedVisit) {
                            item {
                                Surface(
                                    color = colors.localnicSoft,
                                    shape = RoundedCornerShape(3.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.CheckCircle,
                                            contentDescription = null,
                                            tint = colors.localnicBg,
                                            modifier = Modifier.size(11.dp),
                                        )
                                        Text(
                                            text = "Vizită verificată",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = colors.localnicBg,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                ScoreBadge(score = review.foodScore, isDrink = isDrink)
            }

            Text(
                text = "${review.date} · Estimare capcană: ${review.trapEstimatePct}%",
                style = MaterialTheme.typography.labelSmall,
                color = colors.onSurfaceMuted,
            )

            Text(
                text = review.text,
                style = MaterialTheme.typography.bodyMedium,
                color = colors.onBackground,
            )

            review.praisedEmployee?.takeIf { it.isNotBlank() }?.let { praised ->
                Surface(
                    color = colors.surfaceElevated,
                    shape = MaterialTheme.shapes.small,
                ) {
                    Text(
                        text = "Mențiune echipă: $praised",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.primary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }
            }

            // Rule #2: Public owner replies cannot remove/hide reviews
            review.ownerReply?.takeIf { it.isNotBlank() }?.let { reply ->
                Surface(
                    color = colors.surfaceElevated,
                    shape = MaterialTheme.shapes.small,
                    border = BorderStroke(1.dp, colors.border),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(
                            text = "Răspuns ${review.ownerReplyAuthor ?: "proprietar"}",
                            style = MaterialTheme.typography.labelMedium,
                            color = colors.primary,
                        )
                        Text(
                            text = reply,
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onBackground,
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedButton(
                    onClick = onVoteHelpful,
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                ) {
                    Icon(Icons.Filled.ThumbUp, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Util (${review.helpfulCount})", style = MaterialTheme.typography.labelMedium)
                }

                if (isOwnReview) {
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        IconButton(onClick = onEdit) {
                            Icon(Icons.Filled.Edit, contentDescription = "Editează", tint = colors.primary)
                        }
                        IconButton(onClick = onDelete) {
                            Icon(Icons.Filled.Delete, contentDescription = "Șterge", tint = colors.error)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReviewComposerDialog(
    venueName: String,
    questions: List<ReviewQuestionSpec>,
    onDismiss: () -> Unit,
    onSubmit: (
        foodScore: Int,
        trapEstimatePct: Int,
        text: String,
        praisedEmployee: String?,
        safetyScore: Int?,
        noiseLevel: String?,
        answers: Map<String, String>,
        gpsVerified: Boolean,
    ) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    var foodScore by remember { mutableIntStateOf(8) }
    var trapEstimate by remember { mutableIntStateOf(20) }
    var text by remember { mutableStateOf("") }
    var praisedEmployee by remember { mutableStateOf("") }
    var selectedSafety by remember { mutableStateOf<Int?>(null) }
    var selectedNoise by remember { mutableStateOf<String?>(null) }
    var gpsVerified by remember { mutableStateOf(false) }
    val answers = remember { mutableStateMapOf<String, String>() }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            color = colors.surface,
            shape = MaterialTheme.shapes.large,
            border = BorderStroke(1.dp, colors.border),
        ) {
            LazyColumn(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Scrie review · $venueName",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = colors.onBackground,
                            )
                            Text(
                                text = "Nota ta cântărește în funcție de verificarea locală.",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onSurfaceMuted,
                            )
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Filled.Close, contentDescription = "Închide")
                        }
                    }
                }

                item {
                    Text(
                        text = "Scor experiență: $foodScore / 10",
                        style = MaterialTheme.typography.labelLarge,
                        color = colors.onBackground,
                    )
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items((1..10).toList()) { n ->
                            FilterChip(
                                selected = foodScore == n,
                                onClick = { foodScore = n },
                                label = { Text("$n") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = colors.primary,
                                    selectedLabelColor = colors.onPrimary,
                                ),
                            )
                        }
                    }
                }

                item {
                    Text(
                        text = "Cât de capcană turistică pare? $trapEstimate%",
                        style = MaterialTheme.typography.labelLarge,
                        color = colors.onBackground,
                    )
                    Slider(
                        value = trapEstimate.toFloat(),
                        onValueChange = { trapEstimate = (it / 5f).roundToInt() * 5 },
                        valueRange = 0f..100f,
                        colors = SliderDefaults.colors(
                            thumbColor = colors.primary,
                            activeTrackColor = colors.primary,
                        ),
                    )
                }

                item {
                    OutlinedTextField(
                        value = text,
                        onValueChange = { text = it },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        label = { Text("Cum a fost experiența? (min. 8 caractere)") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.primary,
                            unfocusedBorderColor = colors.inputBorder,
                        ),
                    )
                }

                item {
                    OutlinedTextField(
                        value = praisedEmployee,
                        onValueChange = { praisedEmployee = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        label = { Text("Angajat de lăudat (opțional)") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = colors.primary,
                            unfocusedBorderColor = colors.inputBorder,
                        ),
                    )
                }

                item {
                    Text(
                        text = "Siguranță (opțional):",
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.onSurfaceMuted,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        (1..5).forEach { s ->
                            FilterChip(
                                selected = selectedSafety == s,
                                onClick = { selectedSafety = if (selectedSafety == s) null else s },
                                label = { Text("$s") },
                            )
                        }
                    }
                }

                item {
                    Text(
                        text = "Nivel zgomot (opțional):",
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.onSurfaceMuted,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("Liniștit", "Moderat", "Zgomotos").forEach { lvl ->
                            FilterChip(
                                selected = selectedNoise == lvl,
                                onClick = { selectedNoise = if (selectedNoise == lvl) null else lvl },
                                label = { Text(lvl) },
                            )
                        }
                    }
                }

                items(questions) { q ->
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = q.question,
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onBackground,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("da" to "Da", "nu" to "Nu", "ns" to "Nu știu").forEach { (code, lbl) ->
                                FilterChip(
                                    selected = answers[q.key] == code,
                                    onClick = {
                                        if (answers[q.key] == code) answers.remove(q.key)
                                        else answers[q.key] = code
                                    },
                                    label = { Text(lbl) },
                                )
                            }
                        }
                    }
                }

                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { gpsVerified = !gpsVerified },
                    ) {
                        Checkbox(checked = gpsVerified, onCheckedChange = { gpsVerified = it })
                        Text(
                            text = "Confirm vizita pe loc în Timișoara (pondere ×1,3)",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onBackground,
                        )
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                    ) {
                        TextButton(onClick = onDismiss) { Text("Anulează") }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                onSubmit(
                                    foodScore,
                                    trapEstimate,
                                    text,
                                    praisedEmployee.trim().ifBlank { null },
                                    selectedSafety,
                                    selectedNoise,
                                    answers.toMap(),
                                    gpsVerified,
                                )
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.primary,
                                contentColor = colors.onPrimary,
                            ),
                        ) {
                            Text("Publică review")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EditReviewDialog(
    initialScore: Double,
    initialText: String,
    onDismiss: () -> Unit,
    onConfirm: (Double, String) -> Unit,
) {
    val colors = LocalTopFoodColors.current
    var score by remember { mutableIntStateOf(initialScore.roundToInt().coerceIn(1, 10)) }
    var text by remember { mutableStateOf(initialText) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Editează review-ul tău") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Scor: $score / 10", style = MaterialTheme.typography.labelLarge)
                Slider(
                    value = score.toFloat(),
                    onValueChange = { score = it.roundToInt().coerceIn(1, 10) },
                    valueRange = 1f..10f,
                )
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    label = { Text("Text review") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.inputBorder,
                    ),
                )
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(score.toDouble(), text) }) {
                Text("Salvează")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Anulează") }
        },
    )
}
