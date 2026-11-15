package ro.topfood.app.ui.components

import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import ro.topfood.app.data.model.DomainLogic
import ro.topfood.app.data.model.TeamMember
import ro.topfood.app.data.model.TrapBreakdown
import ro.topfood.app.data.model.TrapTier
import ro.topfood.app.data.model.VenueDeliveryInfo
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.ui.theme.CondensedDisplayFontFamily
import ro.topfood.app.ui.theme.CondensedLightFontFamily
import ro.topfood.app.ui.theme.LocalTopFoodColors
import java.net.HttpURLConnection
import java.net.URL

private object VenueImageCache {
    val lru: LruCache<String, ImageBitmap> = LruCache(64)
}

/**
 * Asynchronous venue photography loader with LRU memory cache and an editorial placeholder
 * when loading or offline.
 */
@Composable
fun NetworkVenueImage(
    url: String,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
) {
    val colors = LocalTopFoodColors.current
    var bitmap by remember(url) {
        mutableStateOf(if (url.isNotBlank()) VenueImageCache.lru.get(url) else null)
    }

    LaunchedEffect(url) {
        if (url.isBlank() || bitmap != null) return@LaunchedEffect
        val loaded = withContext(Dispatchers.IO) {
            runCatching {
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    instanceFollowRedirects = true
                    connectTimeout = 6000
                    readTimeout = 6000
                    setRequestProperty("User-Agent", "TopFoodAndroid/1.0")
                }
                conn.inputStream.use { stream ->
                    BitmapFactory.decodeStream(stream)?.asImageBitmap()
                }
            }.getOrNull()
        }
        if (loaded != null) {
            VenueImageCache.lru.put(url, loaded)
            bitmap = loaded
        }
    }

    val currentBitmap = bitmap
    if (currentBitmap != null) {
        Image(
            bitmap = currentBitmap,
            contentDescription = contentDescription,
            contentScale = contentScale,
            modifier = modifier,
        )
    } else {
        Box(
            contentAlignment = Alignment.Center,
            modifier = modifier.background(colors.surfaceElevated),
        ) {
            Canvas(modifier = Modifier.size(28.dp)) {
                val stroke = colors.onSurfaceMuted.copy(alpha = 0.28f)
                drawCircle(
                    color = stroke,
                    radius = size.minDimension * 0.42f,
                    style = Stroke(width = size.minDimension * 0.08f),
                )
                drawCircle(
                    color = stroke,
                    radius = size.minDimension * 0.25f,
                    style = Stroke(width = size.minDimension * 0.05f),
                )
            }
        }
    }
}

/**
 * TopFood square gingham tile mark (faithful Compose Canvas port of BrandPrimitives.tsx CarouMark).
 */
@Composable
fun CarouMark(
    size: Dp = 28.dp,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val pad = w * (1f / 24f)
        val tileSize = w - pad * 2f
        val radius = CornerRadius(w * (4.5f / 24f), w * (4.5f / 24f))

        drawRoundRect(
            color = Color(0xFFB3261E),
            topLeft = Offset(pad, pad),
            size = Size(tileSize, tileSize),
            cornerRadius = radius,
        )
        drawRoundRect(
            color = Color(0xFF9E1F18),
            topLeft = Offset(pad, pad),
            size = Size(tileSize, tileSize),
            cornerRadius = radius,
            style = Stroke(width = w * (1.2f / 24f)),
        )

        val cell = w * (7.5f / 24f)
        val cellRadius = CornerRadius(w * (1f / 24f), w * (1f / 24f))
        val c1 = w * (4.5f / 24f)
        val c2 = w * (12f / 24f)

        drawRoundRect(Color(0xFFD96B63), Offset(c1, c1), Size(cell, cell), cellRadius)
        drawRoundRect(Color(0xFFC44037), Offset(c2, c1), Size(cell, cell), cellRadius)
        drawRoundRect(Color(0xFFC44037), Offset(c1, c2), Size(cell, cell), cellRadius)
        drawRoundRect(Color(0xFFB3261E), Offset(c2, c2), Size(cell, cell), cellRadius)
    }
}

/**
 * TopDrink beer mug coaster mark (faithful Compose Canvas port of BrandPrimitives.tsx CoasterMark).
 */
@Composable
fun CoasterMark(
    size: Dp = 28.dp,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier.size(size)) {
        val sx = this.size.width / 28f
        val sy = this.size.height / 28f

        // Handle on right
        val handlePath = Path().apply {
            moveTo(21f * sx, 11.5f * sy)
            lineTo(23.5f * sx, 11.5f * sy)
            cubicTo(25.5f * sx, 11.5f * sy, 26.5f * sx, 13f * sy, 26.5f * sx, 16.5f * sy)
            cubicTo(26.5f * sx, 20f * sy, 25.5f * sx, 21.5f * sy, 23.5f * sx, 21.5f * sy)
            lineTo(21f * sx, 21.5f * sy)
        }
        drawPath(
            path = handlePath,
            color = Color(0xFFB98A5E),
            style = Stroke(width = 2.1f * sx, cap = StrokeCap.Round, join = StrokeJoin.Round),
        )

        // Amber mug body
        drawRoundRect(
            color = Color(0xFFF2A33A),
            topLeft = Offset(4f * sx, 9.5f * sy),
            size = Size(17f * sx, 15f * sy),
            cornerRadius = CornerRadius(2.5f * sx, 2.5f * sy),
        )
        drawRoundRect(
            color = Color(0xFFB98A5E),
            topLeft = Offset(4f * sx, 9.5f * sy),
            size = Size(17f * sx, 15f * sy),
            cornerRadius = CornerRadius(2.5f * sx, 2.5f * sy),
            style = Stroke(width = 1.4f * sx),
        )

        // Vertical glass ribs
        listOf(8.5f, 12.5f, 16.5f).forEach { rx ->
            drawLine(
                color = Color(0xFFD98824).copy(alpha = 0.5f),
                start = Offset(rx * sx, 13.5f * sy),
                end = Offset(rx * sx, 22f * sy),
                strokeWidth = 1.2f * sx,
                cap = StrokeCap.Round,
            )
        }

        // Creamy foam cloud across top
        val foamPath = Path().apply {
            moveTo(4f * sx, 10.5f * sy)
            cubicTo(3f * sx, 10.5f * sy, 2.8f * sx, 7.2f * sy, 5.2f * sx, 6.8f * sy)
            cubicTo(5.8f * sx, 4.2f * sy, 9.2f * sx, 3.8f * sy, 10.8f * sx, 5.4f * sy)
            cubicTo(12.2f * sx, 3.5f * sy, 16.2f * sx, 3.8f * sy, 17.2f * sx, 5.8f * sy)
            cubicTo(19.8f * sx, 5.6f * sy, 21.8f * sx, 8f * sy, 21f * sx, 10.5f * sy)
            cubicTo(20.6f * sx, 12.2f * sy, 18.8f * sx, 12f * sy, 17.6f * sx, 11.2f * sy)
            cubicTo(16.4f * sx, 12.4f * sy, 14f * sx, 12.2f * sy, 12.8f * sx, 11.1f * sy)
            cubicTo(11.4f * sx, 12.6f * sy, 8.8f * sx, 12.4f * sy, 7.6f * sx, 11.2f * sy)
            cubicTo(6.4f * sx, 12.4f * sy, 4.5f * sx, 12f * sy, 4f * sx, 10.5f * sy)
            close()
        }
        drawPath(path = foamPath, color = Color(0xFFF4EEE2))
        drawPath(
            path = foamPath,
            color = Color(0xFFB98A5E),
            style = Stroke(width = 1.2f * sx, join = StrokeJoin.Round),
        )
    }
}

/**
 * Editorial Brand Wordmark (`topfood/timișoara` or `topdrink/timișoara`).
 */
@Composable
fun BrandWordmark(
    vertical: Vertical,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    val isDrink = vertical == Vertical.DRINK
    val wordColor = if (isDrink) Color(0xFFF2A33A) else colors.onBackground

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = modifier.then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
    ) {
        if (isDrink) {
            CoasterMark(size = 28.dp)
        } else {
            CarouMark(size = 28.dp)
        }
        Text(
            text = buildAnnotatedString {
                withStyle(
                    SpanStyle(
                        fontFamily = CondensedDisplayFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 21.sp,
                        letterSpacing = (-0.5).sp,
                        color = wordColor,
                    )
                ) {
                    append(if (isDrink) "topdrink" else "topfood")
                }
                withStyle(
                    SpanStyle(
                        fontFamily = CondensedLightFontFamily,
                        fontWeight = FontWeight.Normal,
                        fontSize = 21.sp,
                        letterSpacing = (-0.3).sp,
                        color = wordColor.copy(alpha = 0.88f),
                    )
                ) {
                    append("/timișoara")
                }
            },
            maxLines = 1,
        )
    }
}

/**
 * Signature checkered tablecloth divider (`CarouStrip`) with gingham weave on left fading into solid crimson.
 */
@Composable
fun CarouStrip(
    isDrink: Boolean,
    height: Dp = 10.dp,
    modifier: Modifier = Modifier,
) {
    if (isDrink) {
        Divider(
            color = Color(0xFF285443),
            thickness = 1.dp,
            modifier = modifier.fillMaxWidth(),
        )
        return
    }
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
    ) {
        val sq = size.height / 2f
        val leftCols = 3
        val weaveWidth = sq * leftCols

        drawRect(
            color = Color(0xFFB3261E),
            topLeft = Offset(weaveWidth - 1f, 0f),
            size = Size(size.width - weaveWidth + 1f, size.height),
        )

        val row0 = listOf(Color(0xFFFAF5F0), Color(0xFFE08A84), Color(0xFFC94A42))
        val row1 = listOf(Color(0xFFE08A84), Color(0xFFC94A42), Color(0xFFB3261E))
        for (c in 0 until leftCols) {
            drawRect(row0[c], topLeft = Offset(c * sq, 0f), size = Size(sq + 0.5f, sq + 0.5f))
            drawRect(row1[c], topLeft = Offset(c * sq, sq), size = Size(sq + 0.5f, sq + 0.5f))
        }
    }
}

/**
 * Ceramic Plate Score graphic matching BrandPrimitives.tsx `PlateScore`.
 */
@Composable
fun PlateScore(
    score: Double,
    large: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val diameter = if (large) 74.dp else 58.dp
    val numFontSize = if (large) 25.sp else 19.sp
    val cleanliness = when {
        score >= 8.5 -> 0 // pristine
        score >= 7.5 -> 1 // light
        score >= 6.5 -> 2 // messy
        else -> 3         // dirty
    }
    val outerFill = when (cleanliness) {
        0, 1 -> Color(0xFFFFFFFF)
        2 -> Color(0xFFFAF6EE)
        else -> Color(0xFFEFE6D5)
    }
    val outerStroke = if (cleanliness == 3) Color(0xFFB5A996) else Color(0xFFD6CFC5)
    val wellFill = when (cleanliness) {
        0, 1 -> Color(0xFFFAF8F5)
        2 -> Color(0xFFF3ECE0)
        else -> Color(0xFFE8DEC9)
    }
    val wellStroke = if (cleanliness == 3) Color(0xFFC5B8A3) else Color(0xFFE6DFD5)

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier.size(diameter),
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val s = size.minDimension / 100f
            val center = Offset(50f * s, 50f * s)

            // Subtle drop shadow
            drawCircle(
                color = Color(0x183A2418),
                radius = 45.5f * s,
                center = Offset(50f * s, 51.5f * s),
            )
            // Outer plate
            drawCircle(color = outerFill, radius = 45f * s, center = center)
            drawCircle(
                color = outerStroke,
                radius = 45f * s,
                center = center,
                style = Stroke(width = 1.6f * s),
            )
            // Inner well
            drawCircle(color = wellFill, radius = 33f * s, center = center)
            drawCircle(
                color = wellStroke,
                radius = 33f * s,
                center = center,
                style = Stroke(width = 1f * s),
            )

            // Ceramic glaze highlight on top-left rim
            val highlight = Path().apply {
                moveTo(22f * s, 30f * s)
                quadraticBezierTo(33f * s, 16f * s, 54f * s, 14f * s)
            }
            drawPath(
                path = highlight,
                color = Color(0xD9FFFFFF),
                style = Stroke(width = 2.6f * s, cap = StrokeCap.Round),
            )

            when (cleanliness) {
                0 -> {
                    // Gold 4-point sparkles
                    fun drawSparkle(cx: Float, cy: Float, r: Float) {
                        val sp = Path().apply {
                            moveTo(cx, cy - r)
                            lineTo(cx + r * 0.35f, cy - r * 0.35f)
                            lineTo(cx + r, cy)
                            lineTo(cx + r * 0.35f, cy + r * 0.35f)
                            lineTo(cx, cy + r)
                            lineTo(cx - r * 0.35f, cy + r * 0.35f)
                            lineTo(cx - r, cy)
                            lineTo(cx - r * 0.35f, cy - r * 0.35f)
                            close()
                        }
                        drawPath(sp, color = Color(0xFFD8B467))
                    }
                    drawSparkle(24f * s, 21f * s, 4f * s)
                    drawSparkle(79f * s, 25f * s, 3.2f * s)
                }
                1 -> {
                    val oilPath = Path().apply {
                        moveTo(22f * s, 33f * s)
                        quadraticBezierTo(28f * s, 24f * s, 38f * s, 26f * s)
                    }
                    drawPath(
                        oilPath,
                        color = Color(0x66E6B84D),
                        style = Stroke(width = 3.2f * s, cap = StrokeCap.Round),
                    )
                    val sauceArc = Path().apply {
                        moveTo(64f * s, 72f * s)
                        quadraticBezierTo(73f * s, 67f * s, 76f * s, 57f * s)
                    }
                    drawPath(
                        sauceArc,
                        color = Color(0x73BA5D3B),
                        style = Stroke(width = 2.6f * s, cap = StrokeCap.Round),
                    )
                    drawCircle(Color(0x99BA5D3B), radius = 1.6f * s, center = Offset(72f * s, 73f * s))
                    drawCircle(Color(0x996E5649), radius = 1.2f * s, center = Offset(68f * s, 76f * s))
                }
                2 -> {
                    val smear1 = Path().apply {
                        moveTo(19f * s, 54f * s)
                        cubicTo(22f * s, 72f * s, 40f * s, 82f * s, 58f * s, 78f * s)
                    }
                    drawPath(
                        smear1,
                        color = Color(0x9EB8472F),
                        style = Stroke(width = 4.8f * s, cap = StrokeCap.Round),
                    )
                    drawCircle(Color(0xA64A3528), radius = 1.8f * s, center = Offset(74f * s, 36f * s))
                    drawCircle(Color(0xA64A3528), radius = 1.4f * s, center = Offset(26f * s, 68f * s))
                }
                else -> {
                    val heavy1 = Path().apply {
                        moveTo(18f * s, 46f * s)
                        cubicTo(16f * s, 74f * s, 42f * s, 88f * s, 68f * s, 79f * s)
                    }
                    drawPath(
                        heavy1,
                        color = Color(0xBDA23A24),
                        style = Stroke(width = 6.5f * s, cap = StrokeCap.Round),
                    )
                    val heavy2 = Path().apply {
                        moveTo(28f * s, 21f * s)
                        cubicTo(48f * s, 12f * s, 72f * s, 18f * s, 80f * s, 38f * s)
                    }
                    drawPath(
                        heavy2,
                        color = Color(0x9EA23A24),
                        style = Stroke(width = 5f * s, cap = StrokeCap.Round),
                    )
                    drawCircle(Color(0xC74A3528), radius = 2.2f * s, center = Offset(30f * s, 72f * s))
                    drawCircle(Color(0xC74A3528), radius = 1.8f * s, center = Offset(72f * s, 66f * s))
                }
            }
        }

        Text(
            text = DomainLogic.formatScore(score),
            fontFamily = CondensedDisplayFontFamily,
            fontWeight = FontWeight.ExtraBold,
            fontSize = numFontSize,
            letterSpacing = (-0.5).sp,
            color = Color(0xFF3A2418),
        )
    }
}

/**
 * Amber Beer Mug Score graphic matching BrandPrimitives.tsx `MugScore`.
 */
@Composable
fun MugScore(
    score: Double,
    large: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val width = if (large) 78.dp else 62.dp
    val height = if (large) 68.dp else 54.dp
    val numFontSize = if (large) 23.sp else 18.sp

    val beerFill = when {
        score >= 8.5 -> Color(0xFFF2A33A)
        score >= 7.5 -> Color(0xFFECA03A)
        score >= 6.5 -> Color(0xFFCF852B)
        else -> Color(0xFFB8A98E)
    }

    Box(
        modifier = modifier.size(width = width, height = height),
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val sx = size.width / 116f
            val sy = size.height / 100f
            fun x(v: Float) = (v + 16f) * sx
            fun y(v: Float) = v * sy

            // Right mug handle
            val handle = Path().apply {
                moveTo(x(72f), y(38f))
                lineTo(x(84f), y(38f))
                cubicTo(x(92f), y(38f), x(96f), y(44f), x(96f), y(58f))
                cubicTo(x(96f), y(72f), x(92f), y(78f), x(84f), y(78f))
                lineTo(x(72f), y(78f))
            }
            drawPath(
                path = handle,
                color = Color(0xFFB98A5E),
                style = Stroke(width = 6.5f * sx, cap = StrokeCap.Round, join = StrokeJoin.Round),
            )

            // Amber mug body
            drawRoundRect(
                color = beerFill,
                topLeft = Offset(x(14f), y(30f)),
                size = Size(58f * sx, 58f * sy),
                cornerRadius = CornerRadius(8f * sx, 8f * sy),
            )
            drawRoundRect(
                color = Color(0xFFB98A5E),
                topLeft = Offset(x(14f), y(30f)),
                size = Size(58f * sx, 58f * sy),
                cornerRadius = CornerRadius(8f * sx, 8f * sy),
                style = Stroke(width = 2.6f * sx),
            )

            // Vertical glass rib reflections
            drawLine(
                color = Color(0x2EFFFFFF),
                start = Offset(x(23f), y(42f)),
                end = Offset(x(23f), y(79f)),
                strokeWidth = 3f * sx,
                cap = StrokeCap.Round,
            )
            drawLine(
                color = Color(0x28D98824),
                start = Offset(x(62f), y(42f)),
                end = Offset(x(62f), y(79f)),
                strokeWidth = 3f * sx,
                cap = StrokeCap.Round,
            )

            // Foam crown on top
            val foam = Path().apply {
                moveTo(x(14f), y(33f))
                cubicTo(x(10f), y(33f), x(9f), y(21f), x(18f), y(20f))
                cubicTo(x(20f), y(10f), x(33f), y(9f), x(38f), y(15f))
                cubicTo(x(43f), y(8f), x(57f), y(9f), x(60f), y(17f))
                cubicTo(x(70f), y(16f), x(76f), y(24f), x(72f), y(33f))
                cubicTo(x(70f), y(38f), x(64f), y(37f), x(60f), y(34f))
                cubicTo(x(56f), y(39f), x(48f), y(38f), x(44f), y(34f))
                cubicTo(x(39f), y(40f), x(30f), y(39f), x(26f), y(34f))
                cubicTo(x(22f), y(39f), x(16f), y(37f), x(14f), y(33f))
                close()
            }
            drawPath(foam, color = Color(0xFFF4EEE2))
            drawPath(
                foam,
                color = Color(0xFFB98A5E),
                style = Stroke(width = 2.4f * sx, join = StrokeJoin.Round),
            )
        }

        // Centered score aligned cleanly inside the mug body
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxSize()
                .padding(top = if (large) 16.dp else 13.dp, end = if (large) 12.dp else 10.dp),
        ) {
            Text(
                text = DomainLogic.formatScore(score),
                fontFamily = CondensedDisplayFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = numFontSize,
                letterSpacing = (-0.4).sp,
                color = Color(0xFF17382C),
            )
        }
    }
}

/**
 * Unified Honest Score Badge (`PlateScore` in TopFood, `MugScore` in TopDrink)
 * plus `"Scor Onest"` directly underneath.
 */
@Composable
fun ScoreBadge(
    score: Double,
    isDrink: Boolean,
    modifier: Modifier = Modifier,
    large: Boolean = false,
    showLabel: Boolean = true,
) {
    val labelColor = if (isDrink) Color(0xFFF2A33A) else Color(0xFFB3261E)
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier,
    ) {
        if (isDrink) {
            MugScore(score = score, large = large)
        } else {
            PlateScore(score = score, large = large)
        }
        if (showLabel) {
            Text(
                text = "Scor Onest",
                fontSize = if (large) 12.sp else 11.sp,
                fontWeight = FontWeight.Bold,
                color = labelColor,
                maxLines = 1,
                modifier = Modifier.padding(top = 1.dp),
            )
        }
    }
}

@Composable
fun LocalnicBadge(
    neighborhood: String? = null,
    modifier: Modifier = Modifier,
    label: String? = null,
) {
    val bg = Color(0xFF2D5130)
    val fg = Color(0xFFFBF6EA)
    val textValue = label ?: if (!neighborhood.isNullOrBlank()) "Localnic · $neighborhood" else "Localnic · 2,0×"

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = bg,
        contentColor = fg,
        border = BorderStroke(1.dp, fg.copy(alpha = 0.35f)),
        modifier = modifier,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
        ) {
            Canvas(modifier = Modifier.size(11.dp)) {
                val u = size.minDimension / 24f
                val path = Path().apply {
                    moveTo(3f * u, 10.5f * u)
                    lineTo(12f * u, 3f * u)
                    lineTo(21f * u, 10.5f * u)
                    lineTo(21f * u, 20f * u)
                    lineTo(14.5f * u, 20f * u)
                    lineTo(14.5f * u, 14f * u)
                    lineTo(9.5f * u, 14f * u)
                    lineTo(9.5f * u, 20f * u)
                    lineTo(3f * u, 20f * u)
                    close()
                }
                drawPath(path, color = fg, style = Stroke(width = 2.2f * u, join = StrokeJoin.Round))
            }
            Spacer(Modifier.width(4.dp))
            Text(
                text = textValue,
                style = MaterialTheme.typography.labelSmall,
                color = fg,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun TuristBadge(
    modifier: Modifier = Modifier,
    label: String = "Turist · 1,0×",
) {
    val colors = LocalTopFoodColors.current
    val fg = if (colors.isDark) Color(0xFFE3CDA6) else Color(0xFF5C4033)
    val bg = if (colors.isDark) colors.surface else Color(0xFFFFFFFF)

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = bg,
        border = BorderStroke(1.dp, colors.turistBorder),
        contentColor = fg,
        modifier = modifier,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
        ) {
            Canvas(modifier = Modifier.size(11.dp)) {
                val u = size.minDimension / 24f
                val r = 9f * u
                drawCircle(color = fg, radius = r, style = Stroke(width = 1.9f * u))
                drawLine(fg, Offset(3f * u, 12f * u), Offset(21f * u, 12f * u), strokeWidth = 1.6f * u)
                drawLine(fg, Offset(12f * u, 3f * u), Offset(12f * u, 21f * u), strokeWidth = 1.6f * u)
            }
            Spacer(Modifier.width(4.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = fg,
                maxLines = 1,
            )
        }
    }
}

@Composable
fun InfluencerBadge(
    followers: String? = null,
    isPaid: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    val fg = colors.onBackground
    val followerLabel = followers?.let { " · $it" } ?: ""
    val prefix = if (isPaid) "Parteneriat plătit$followerLabel · 0,2×" else "Contribuitor verificat$followerLabel"

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, fg.copy(alpha = 0.7f)),
        contentColor = fg,
        modifier = modifier,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
        ) {
            Canvas(modifier = Modifier.size(11.dp)) {
                val u = size.minDimension / 24f
                drawRoundRect(
                    color = fg,
                    topLeft = Offset(3f * u, 7f * u),
                    size = Size(18f * u, 13f * u),
                    cornerRadius = CornerRadius(2.5f * u, 2.5f * u),
                    style = Stroke(width = 1.8f * u),
                )
                drawCircle(
                    color = fg,
                    radius = 3.5f * u,
                    center = Offset(12f * u, 13.5f * u),
                    style = Stroke(width = 1.8f * u),
                )
            }
            Spacer(Modifier.width(4.dp))
            Text(
                text = prefix,
                style = MaterialTheme.typography.labelSmall,
                color = fg,
                maxLines = 1,
            )
        }
    }
}

@Composable
fun SponsoredPill(modifier: Modifier = Modifier) {
    val colors = LocalTopFoodColors.current
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = colors.border.copy(alpha = 0.75f),
        contentColor = colors.onSurfaceMuted,
        modifier = modifier,
    ) {
        Text(
            text = "SPONSORIZAT",
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
        )
    }
}

@Composable
fun TrapBadge(
    trapIndex: Int,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    val tier = DomainLogic.getTrapTier(trapIndex)
    val (bg, fg, label) = when (tier) {
        TrapTier.LOCAL_STAPLE -> Triple(
            colors.localnicSoft,
            if (colors.isDark) Color(0xFFAED3A8) else Color(0xFF2D5130),
            "Favorit local · $trapIndex%"
        )
        TrapTier.MIXED_FAIR -> Triple(
            colors.possibleTrapBg,
            colors.possibleTrapFg,
            "Posibilă capcană · $trapIndex%"
        )
        TrapTier.TOURIST_TRAP -> Triple(
            colors.trapBg,
            colors.trapFg,
            "Capcană · $trapIndex%"
        )
    }

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = bg,
        contentColor = fg,
        modifier = modifier,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
        ) {
            if (tier != TrapTier.LOCAL_STAPLE) {
                Icon(
                    imageVector = Icons.Filled.Warning,
                    contentDescription = null,
                    modifier = Modifier.size(11.dp),
                )
                Spacer(Modifier.width(4.dp))
            }
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                maxLines = 1,
            )
        }
    }
}

/**
 * Gold/Silver/Bronze monthly trophy medal badge matching BrandPrimitives.tsx `TrophyMedalBadge`.
 */
@Composable
fun TrophyMedalBadge(
    rank: Int,
    label: String? = null,
    compact: Boolean = false,
    modifier: Modifier = Modifier,
) {
    if (rank !in 1..3) return
    val (bg, border, fg) = when (rank) {
        1 -> Triple(Color(0xFFFFF8E6), Color(0xFFD8A32A), Color(0xFF7A4F08))
        2 -> Triple(Color(0xFFF4F5F7), Color(0xFF9AA3B0), Color(0xFF363D47))
        else -> Triple(Color(0xFFFDF2EB), Color(0xFFC77B48), Color(0xFF6B3716))
    }

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = bg,
        border = BorderStroke(1.dp, border),
        contentColor = fg,
        modifier = modifier,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.padding(
                horizontal = if (compact) 6.dp else 8.dp,
                vertical = if (compact) 2.dp else 3.dp,
            ),
        ) {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = null,
                tint = fg,
                modifier = Modifier.size(if (compact) 11.dp else 13.dp),
            )
            Text(
                text = if (!label.isNullOrBlank()) "#$rank $label" else "#$rank",
                style = MaterialTheme.typography.labelSmall,
                color = fg,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun DeliveryBadge(
    delivery: VenueDeliveryInfo?,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    val available = delivery?.available == true
    val platformsText = if (available) {
        val list = buildList {
            if (delivery?.ownDelivery == true) add("Livrare proprie")
            addAll(delivery?.platforms.orEmpty())
        }
        if (list.isNotEmpty()) "Livrare: ${list.joinToString(", ")}" else "Livrare disponibilă"
    } else {
        "Doar la masă / ridicare"
    }

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = if (available) colors.localnicSoft else colors.surfaceElevated,
        border = BorderStroke(1.dp, if (available) colors.localnicBg.copy(alpha = 0.35f) else colors.border),
        modifier = modifier,
    ) {
        Text(
            text = platformsText,
            style = MaterialTheme.typography.labelSmall,
            color = if (available) {
                if (colors.isDark) Color(0xFFAED3A8) else Color(0xFF2D5130)
            } else {
                colors.onSurfaceMuted
            },
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
        )
    }
}

@Composable
fun PartnerBadge(
    isDrink: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    val bg = if (isDrink) Color(0xFF1E4335) else colors.surface
    val border = if (isDrink) Color(0xFFF2A33A) else colors.onBackground
    val fg = if (isDrink) Color(0xFFF2A33A) else colors.onBackground

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = bg,
        border = BorderStroke(1.dp, border),
        modifier = modifier,
    ) {
        Text(
            text = if (isDrink) "Partener TOP DRINK" else "Partener TOP FOOD",
            style = MaterialTheme.typography.labelSmall,
            color = fg,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
        )
    }
}

@Composable
fun LocalVsTouristBars(
    localsScore: Double,
    touristsScore: Double,
    googleRawRating: Double,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        ScoreComparisonBar(
            label = "Localnici verificați (2,0×)",
            scoreText = DomainLogic.formatScore(localsScore),
            fraction = (localsScore / 10.0).toFloat().coerceIn(0f, 1f),
            barColor = colors.localnicBg,
            textColor = colors.onBackground,
        )
        ScoreComparisonBar(
            label = "Turiști & vizitatori (1,0×)",
            scoreText = DomainLogic.formatScore(touristsScore),
            fraction = (touristsScore / 10.0).toFloat().coerceIn(0f, 1f),
            barColor = colors.turistBorder,
            textColor = colors.onBackground,
        )
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "Rating Google brut (neponderat)",
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurfaceMuted,
            )
            Text(
                text = "${DomainLogic.formatScore(googleRawRating)} / 5 ★",
                style = MaterialTheme.typography.labelMedium,
                color = colors.onSurfaceMuted,
            )
        }
    }
}

@Composable
private fun ScoreComparisonBar(
    label: String,
    scoreText: String,
    fraction: Float,
    barColor: Color,
    textColor: Color,
) {
    val colors = LocalTopFoodColors.current
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(text = label, style = MaterialTheme.typography.bodySmall, color = textColor)
            Text(text = "$scoreText / 10", style = MaterialTheme.typography.labelMedium, color = textColor)
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(7.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(colors.border.copy(alpha = 0.6f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(4.dp))
                    .background(barColor)
            )
        }
    }
}

/**
 * Editorial Trap Warning Card matching BrandPrimitives.tsx `AvertizareaCard`
 * (`3.dp` crimson top border, index out of 100, bullet reasons, collapsible 5-signal formula).
 */
@Composable
fun AvertizareaCard(
    trapIndex: Int,
    reasons: List<String>,
    modifier: Modifier = Modifier,
    venueName: String? = null,
    subtitle: String? = null,
    breakdown: TrapBreakdown? = null,
) {
    val colors = LocalTopFoodColors.current
    val isHighTrap = trapIndex >= 65
    val accent = if (isHighTrap) Color(0xFFB3261E) else colors.warning
    var showFormula by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, colors.border),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(accent)
            )
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(14.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.Warning,
                            contentDescription = null,
                            tint = accent,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = if (isHighTrap) "Avertizare Piața Unirii" else "Semnale monitorizate",
                            style = MaterialTheme.typography.labelSmall,
                            color = accent,
                        )
                    }
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            text = "$trapIndex",
                            fontFamily = CondensedDisplayFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 24.sp,
                            color = accent,
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = "din 100",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onSurfaceMuted,
                            modifier = Modifier.padding(bottom = 3.dp),
                        )
                    }
                }

                if (!venueName.isNullOrBlank()) {
                    Text(
                        text = venueName,
                        style = MaterialTheme.typography.headlineLarge,
                        color = colors.onBackground,
                    )
                }
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurfaceMuted,
                    )
                }

                if (reasons.isEmpty()) {
                    Text(
                        text = "Prețuri aliniate cu media cartierului și clientelă recurentă din Timișoara.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurfaceMuted,
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        reasons.forEach { reason ->
                            Text(
                                text = "• $reason",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.onBackground,
                            )
                        }
                    }
                }

                if (breakdown != null) {
                    Text(
                        text = if (showFormula) "Ascunde calculul ↑" else "Cum calculăm asta ↓",
                        style = MaterialTheme.typography.labelMedium,
                        color = accent,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable { showFormula = !showFormula },
                    )
                    if (showFormula) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = colors.surfaceElevated,
                            border = BorderStroke(1.dp, colors.border),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                                modifier = Modifier.padding(10.dp),
                            ) {
                                Text(
                                    text = "Scorul măsoară 5 semnale obiective:",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = colors.onBackground,
                                )
                                Text(
                                    text = "1. Diferență turiști vs. localnici: +${DomainLogic.formatScore(breakdown.touristVsLocalGap)} pct",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.onSurfaceMuted,
                                )
                                Text(
                                    text = "2. Proximitate zonă turistică: ${breakdown.touristZoneProximityM} m",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.onSurfaceMuted,
                                )
                                Text(
                                    text = "3. Preț față de media categoriei: +${breakdown.priceVsCategoryPct}%",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.onSurfaceMuted,
                                )
                                Text(
                                    text = "4. Review-uri în limbi străine: ${breakdown.foreignLangReviewsPct}%",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.onSurfaceMuted,
                                )
                                Text(
                                    text = "5. Vizite unice (fără revenire): ${breakdown.singleVisitPct}%",
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

@Composable
fun CrowdMeter(
    segments: Int,
    label: String?,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    val clamped = segments.coerceIn(1, 5)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = modifier,
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            for (i in 1..5) {
                val active = i <= clamped
                val segColor = when {
                    !active -> colors.border
                    clamped >= 4 -> colors.primary
                    else -> Color(0xFF4CAF50)
                }
                Box(
                    modifier = Modifier
                        .width(14.dp)
                        .height(7.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(segColor)
                )
            }
        }
        Text(
            text = label ?: "Nivel aglomerație $clamped/5",
            style = MaterialTheme.typography.bodySmall,
            color = colors.onSurfaceMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun EmployeeEcusonCard(
    member: TeamMember,
    modifier: Modifier = Modifier,
) {
    val colors = LocalTopFoodColors.current
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = colors.surfaceElevated,
        border = BorderStroke(
            width = if (member.isEmployeeOfMonth == true) 1.5.dp else 1.dp,
            color = if (member.isEmployeeOfMonth == true) colors.warning else colors.border
        ),
        modifier = modifier,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.14f))
                    .border(1.dp, colors.primary.copy(alpha = 0.4f), CircleShape)
            ) {
                Text(
                    text = member.name.take(1).uppercase(),
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.primary,
                )
            }
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = member.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.onBackground,
                    )
                    if (member.isEmployeeOfMonth == true) {
                        Spacer(Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(3.dp),
                            color = colors.warning,
                            contentColor = colors.onWarning,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                            ) {
                                Icon(Icons.Filled.Star, contentDescription = null, modifier = Modifier.size(10.dp))
                                Spacer(Modifier.width(3.dp))
                                Text(
                                    text = member.monthLabel ?: "Angajatul lunii",
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            }
                        }
                    }
                }
                Text(
                    text = "${member.role} · ${member.positiveMentions} aprecieri de la localnici",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceMuted,
                )
            }
        }
    }
}

/**
 * Deterministic visual QR matrix drawn directly in Compose Canvas for Loyalty Cards.
 */
@Composable
fun QrCodeCanvas(
    seed: String,
    fgColor: Color,
    bgColor: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(bgColor)
            .padding(6.dp)
    ) {
        val grid = 15
        val cell = size.minDimension / grid
        var hash = seed.hashCode().toLong() and 0xFFFFFFFFL
        if (hash == 0L) hash = 0x5F3759DFL

        fun isFinder(r: Int, c: Int): Boolean {
            val topLeft = r < 5 && c < 5
            val topRight = r < 5 && c >= grid - 5
            val bottomLeft = r >= grid - 5 && c < 5
            return topLeft || topRight || bottomLeft
        }

        fun finderFilled(r: Int, c: Int): Boolean {
            val lr = if (r >= grid - 5) r - (grid - 5) else r
            val lc = if (c >= grid - 5) c - (grid - 5) else c
            return lr == 0 || lr == 4 || lc == 0 || lc == 4 || (lr == 2 && lc == 2)
        }

        for (r in 0 until grid) {
            for (c in 0 until grid) {
                val filled = if (isFinder(r, c)) {
                    finderFilled(r, c)
                } else {
                    hash = (hash * 1664525L + 1013904223L) and 0xFFFFFFFFL
                    ((hash shr 16) and 1L) == 1L
                }
                if (filled) {
                    drawRect(
                        color = fgColor,
                        topLeft = Offset(c * cell, r * cell),
                        size = Size(cell * 0.94f, cell * 0.94f),
                    )
                }
            }
        }
    }
}
