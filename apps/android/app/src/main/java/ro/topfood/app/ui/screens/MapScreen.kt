package ro.topfood.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ro.topfood.app.data.model.DomainLogic
import ro.topfood.app.data.model.Restaurant
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.ui.MainUiState
import ro.topfood.app.ui.components.ScoreBadge
import ro.topfood.app.ui.components.TrapBadge
import ro.topfood.app.ui.theme.LocalTopFoodColors
import kotlin.math.cos
import kotlin.math.hypot

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    state: MainUiState,
    onSelectTaste: (String?) -> Unit,
    onToggleTouristZones: () -> Unit,
    onOpenVenue: (String) -> Unit,
    onClearFocusSlug: () -> Unit,
) {
    val colors = LocalTopFoodColors.current
    val context = LocalContext.current
    val isDrink = state.vertical == Vertical.DRINK
    val textMeasurer = rememberTextMeasurer()

    val visibleVenues = remember(state.activeVenues, state.mapSelectedTaste) {
        state.activeVenues.filter { DomainLogic.matchesMapTaste(it, state.mapSelectedTaste) }
    }

    var selectedVenue by remember(state.vertical) {
        mutableStateOf<Restaurant?>(visibleVenues.firstOrNull())
    }

    // Center & zoom state around Timisoara (lng=21.2286, lat=45.7558)
    var centerLng by remember { mutableFloatStateOf(21.2286f) }
    var centerLat by remember { mutableFloatStateOf(45.7540f) }
    var zoomScale by remember { mutableFloatStateOf(1.0f) }

    LaunchedEffect(state.mapFocusSlug, visibleVenues) {
        val focus = state.mapFocusSlug
        if (!focus.isNullOrBlank()) {
            val found = state.allVenues.find { it.slug == focus || it.id == focus }
            if (found != null) {
                selectedVenue = found
                centerLng = found.coordinates.lng.toFloat()
                centerLat = found.coordinates.lat.toFloat()
                zoomScale = 1.6f
            }
            onClearFocusSlug()
        } else if (selectedVenue == null || visibleVenues.none { it.id == selectedVenue?.id }) {
            selectedVenue = visibleVenues.firstOrNull()
        }
    }

    val tasteLabels = remember {
        listOf(
            "burger" to "Burger",
            "pizza" to "Pizza",
            "pasta" to "Paste",
            "soup" to "Ciorbă",
            "dessert" to "Desert",
            "coffee" to "Cafea",
            "beer" to "Bere",
            "wine" to "Vin",
            "cocktail" to "Cocktail",
            "vegetarian" to "Vegetarian",
            "vegan" to "Vegan",
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
    ) {
        // 1. Taste & Tourist Trap Controls
        Column(
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .padding(vertical = 8.dp)
        ) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                item {
                    FilterChip(
                        selected = state.mapShowTouristZones,
                        onClick = onToggleTouristZones,
                        leadingIcon = {
                            Icon(Icons.Filled.Warning, contentDescription = null, modifier = Modifier.size(14.dp))
                        },
                        label = { Text("Zone turistice (300m)", style = MaterialTheme.typography.bodySmall) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = colors.trapBg,
                            selectedLabelColor = colors.trapFg,
                            selectedLeadingIconColor = colors.trapFg,
                            containerColor = colors.surfaceElevated,
                            labelColor = colors.onBackground,
                        ),
                    )
                }
                items(state.city.neighborhoodZones, key = { it.id }) { zone ->
                    FilterChip(
                        selected = false,
                        onClick = {
                            if (zone.center.size >= 2) {
                                centerLng = zone.center[0].toFloat()
                                centerLat = zone.center[1].toFloat()
                                zoomScale = 1.45f
                            }
                        },
                        label = { Text(zone.name, style = MaterialTheme.typography.bodySmall) },
                        colors = FilterChipDefaults.filterChipColors(
                            containerColor = colors.surfaceElevated,
                            labelColor = colors.onBackground,
                        ),
                    )
                }
            }

            LazyRow(
                contentPadding = PaddingValues(horizontal = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                items(tasteLabels) { (id, label) ->
                    val active = state.mapSelectedTaste == id
                    FilterChip(
                        selected = active,
                        onClick = { onSelectTaste(id) },
                        label = { Text(label, style = MaterialTheme.typography.bodySmall) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = colors.primary,
                            selectedLabelColor = colors.onPrimary,
                            containerColor = colors.background,
                            labelColor = colors.onBackground,
                        ),
                    )
                }
            }
        }

        // 2. Interactive Vector Canvas Map of Timișoara
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .clipToBounds()
        ) {
            val mapBg = if (isDrink) Color(0xFF0E261D) else if (colors.isDark) Color(0xFF1A1816) else Color(0xFFF3ECDC)
            val gridColor = colors.border.copy(alpha = 0.55f)
            val begaColor = if (isDrink || colors.isDark) Color(0xFF286073) else Color(0xFF7BB3C9)
            val hoodFill = colors.primary.copy(alpha = 0.08f)
            val hoodStroke = colors.onSurfaceMuted.copy(alpha = 0.40f)
            val trapFill = colors.trapBg.copy(alpha = 0.14f)
            val trapStroke = colors.trapBg.copy(alpha = 0.65f)

            fun geoToScreen(lng: Double, lat: Double, w: Float, h: Float): Offset {
                val baseSpanLng = 0.062f / zoomScale
                val cosLat = cos(Math.toRadians(45.754)).toFloat()
                val baseSpanLat = (baseSpanLng * (h / w.coerceAtLeast(1f))) * cosLat
                val x = ((lng.toFloat() - centerLng) / baseSpanLng + 0.5f) * w
                val y = (0.5f - (lat.toFloat() - centerLat) / baseSpanLat) * h
                return Offset(x, y)
            }

            Canvas(
                modifier = Modifier
                    .fillMaxSize()
                    .background(mapBg)
                    .pointerInput(Unit) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            val newZoom = (zoomScale * zoom).coerceIn(0.65f, 3.2f)
                            zoomScale = newZoom
                            val w = size.width.toFloat().coerceAtLeast(1f)
                            val h = size.height.toFloat().coerceAtLeast(1f)
                            val spanLng = 0.062f / zoomScale
                            val cosLat = cos(Math.toRadians(45.754)).toFloat()
                            val spanLat = (spanLng * (h / w)) * cosLat
                            centerLng -= (pan.x / w) * spanLng
                            centerLat += (pan.y / h) * spanLat
                        }
                    }
                    .pointerInput(visibleVenues, centerLng, centerLat, zoomScale) {
                        detectTapGestures { tapOffset ->
                            val w = size.width.toFloat()
                            val h = size.height.toFloat()
                            var closest: Restaurant? = null
                            var bestDist = 72f
                            for (v in visibleVenues) {
                                val pos = geoToScreen(v.coordinates.lng, v.coordinates.lat, w, h)
                                val dist = hypot(pos.x - tapOffset.x, pos.y - tapOffset.y)
                                if (dist < bestDist) {
                                    bestDist = dist
                                    closest = v
                                }
                            }
                            if (closest != null) {
                                selectedVenue = closest
                            }
                        }
                    }
            ) {
                val w = size.width
                val h = size.height

                // Subtle map street grid
                val step = 72f
                var gx = 0f
                while (gx < w) {
                    drawLine(gridColor, Offset(gx, 0f), Offset(gx, h), strokeWidth = 1f)
                    gx += step
                }
                var gy = 0f
                while (gy < h) {
                    drawLine(gridColor, Offset(0f, gy), Offset(w, gy), strokeWidth = 1f)
                    gy += step
                }

                // Neighborhood Polygons
                state.city.neighborhoodZones.forEach { zone ->
                    zone.coordinates.forEach { ring ->
                        if (ring.size >= 3) {
                            val path = Path()
                            ring.forEachIndexed { idx, pt ->
                                val off = geoToScreen(pt[0], pt[1], w, h)
                                if (idx == 0) path.moveTo(off.x, off.y) else path.lineTo(off.x, off.y)
                            }
                            path.close()
                            drawPath(path, color = hoodFill)
                            drawPath(path, color = hoodStroke, style = Stroke(width = 2f))
                        }
                    }
                    if (zone.center.size >= 2) {
                        val cPos = geoToScreen(zone.center[0], zone.center[1], w, h)
                        val measured = textMeasurer.measure(
                            zone.name.uppercase(),
                            style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold),
                        )
                        drawText(
                            measured,
                            color = colors.onSurfaceMuted.copy(alpha = 0.72f),
                            topLeft = Offset(cPos.x - measured.size.width / 2f, cPos.y - measured.size.height / 2f),
                        )
                    }
                }

                // Bega Canal polyline across Timișoara
                val begaPoints = listOf(
                    21.201 to 45.7448,
                    21.213 to 45.7488,
                    21.224 to 45.7501,
                    21.233 to 45.7497,
                    21.242 to 45.7524,
                    21.257 to 45.7555,
                )
                val begaPath = Path()
                begaPoints.forEachIndexed { idx, (lng, lat) ->
                    val p = geoToScreen(lng, lat, w, h)
                    if (idx == 0) begaPath.moveTo(p.x, p.y) else begaPath.lineTo(p.x, p.y)
                }
                drawPath(
                    begaPath,
                    color = begaColor,
                    style = Stroke(width = 14f * zoomScale.coerceAtMost(1.8f), cap = StrokeCap.Round),
                )

                // Tourist Zone 300m Warning Circles
                if (state.mapShowTouristZones) {
                    val degLatPerM = 1.0 / 111320.0
                    val baseSpanLng = 0.062f / zoomScale
                    val cosLat = cos(Math.toRadians(45.754)).toFloat()
                    val baseSpanLat = (baseSpanLng * (h / w.coerceAtLeast(1f))) * cosLat
                    state.city.touristZones.forEach { tz ->
                        val centerPt = geoToScreen(tz.center.lng, tz.center.lat, w, h)
                        val radiusPx = ((tz.radiusM * degLatPerM) / baseSpanLat * h).toFloat()
                        drawCircle(
                            color = trapFill,
                            radius = radiusPx,
                            center = centerPt,
                        )
                        drawCircle(
                            color = trapStroke,
                            radius = radiusPx,
                            center = centerPt,
                            style = Stroke(
                                width = 2.5f,
                                pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 8f)),
                            ),
                        )
                    }
                }

                // Venue Markers
                visibleVenues.forEach { venue ->
                    val pos = geoToScreen(venue.coordinates.lng, venue.coordinates.lat, w, h)
                    val isSelected = selectedVenue?.id == venue.id
                    val pinColor = when {
                        venue.touristTrapIndex >= 65 -> colors.trapBg
                        venue.touristTrapIndex >= 35 -> colors.warning
                        else -> colors.localnicBg
                    }
                    val radius = if (isSelected) 24f else 17f

                    if (isSelected) {
                        drawCircle(
                            color = colors.primary.copy(alpha = 0.28f),
                            radius = radius + 11f,
                            center = pos,
                        )
                    }
                    drawCircle(color = Color.White, radius = radius + 3f, center = pos)
                    drawCircle(color = pinColor, radius = radius, center = pos)

                    val scoreStr = DomainLogic.formatScore(venue.foodQualityScore)
                    val m = textMeasurer.measure(
                        scoreStr,
                        style = TextStyle(
                            fontSize = if (isSelected) 11.sp else 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                        ),
                    )
                    drawText(
                        m,
                        color = Color.White,
                        topLeft = Offset(pos.x - m.size.width / 2f, pos.y - m.size.height / 2f),
                    )
                }
            }

            // Zoom & Reset Floating Controls
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = colors.surface.copy(alpha = 0.94f),
                border = BorderStroke(1.dp, colors.border),
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(12.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    IconButton(onClick = { zoomScale = (zoomScale * 1.25f).coerceAtMost(3.2f) }, modifier = Modifier.size(38.dp)) {
                        Icon(Icons.Filled.Add, contentDescription = "Zoom in", tint = colors.onBackground)
                    }
                    IconButton(onClick = { zoomScale = (zoomScale * 0.8f).coerceAtLeast(0.65f) }, modifier = Modifier.size(38.dp)) {
                        Text("−", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = colors.onBackground)
                    }
                    IconButton(
                        onClick = {
                            centerLng = 21.2286f
                            centerLat = 45.7540f
                            zoomScale = 1.0f
                        },
                        modifier = Modifier.size(38.dp),
                    ) {
                        Icon(Icons.Filled.Refresh, contentDescription = "Centrează Timișoara", tint = colors.onBackground, modifier = Modifier.size(18.dp))
                    }
                }
            }

            // Legend Pill
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = colors.surface.copy(alpha = 0.92f),
                border = BorderStroke(1.dp, colors.border),
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(12.dp)
            ) {
                Text(
                    text = "${visibleVenues.size} localuri · atinge un pin",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.onBackground,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                )
            }
        }

        // 3. Selected Venue Bottom Card
        selectedVenue?.let { venue ->
            Surface(
                shape = RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp),
                color = colors.surface,
                border = BorderStroke(1.dp, colors.border),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ScoreBadge(score = venue.foodQualityScore, isDrink = isDrink)
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = venue.name,
                                style = MaterialTheme.typography.titleLarge,
                                color = colors.onBackground,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                text = "${venue.shortCategory ?: venue.cuisine} · ${venue.address}",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onSurfaceMuted,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Spacer(Modifier.height(3.dp))
                            TrapBadge(trapIndex = venue.touristTrapIndex)
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = { onOpenVenue(venue.slug) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.primary,
                                contentColor = colors.onPrimary,
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Vezi detalii & review-uri")
                        }
                        OutlinedButton(
                            onClick = {
                                val gmmUri = Uri.parse(
                                    "geo:${venue.coordinates.lat},${venue.coordinates.lng}?q=${Uri.encode(venue.name + ", Timișoara")}"
                                )
                                val intent = Intent(Intent.ACTION_VIEW, gmmUri)
                                runCatching { context.startActivity(intent) }
                            }
                        ) {
                            Icon(Icons.Filled.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Maps")
                        }
                    }
                }
            }
        }
    }
}
