package ro.topfood.app.ui.theme

import android.app.Activity
import android.graphics.Typeface
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import ro.topfood.app.data.model.Vertical

val CondensedDisplayFontFamily: FontFamily = FontFamily(
    Typeface.create("sans-serif-condensed", Typeface.BOLD)
)

val CondensedLightFontFamily: FontFamily = FontFamily(
    Typeface.create("sans-serif-condensed", Typeface.NORMAL)
)

@Immutable
data class TopFoodColors(
    val isDrink: Boolean,
    val isDark: Boolean,
    val background: Color,
    val surface: Color,
    val surfaceElevated: Color,
    val sponsoredSurface: Color,
    val onBackground: Color,
    val onSurfaceMuted: Color,
    val border: Color,
    val inputBorder: Color,
    val primary: Color,
    val onPrimary: Color,
    val secondary: Color,
    val onSecondary: Color,
    val warning: Color,
    val onWarning: Color,
    val error: Color,
    val localnicBg: Color,
    val localnicFg: Color,
    val localnicSoft: Color,
    val turistFg: Color,
    val turistBorder: Color,
    val trapBg: Color,
    val trapFg: Color,
    val possibleTrapBg: Color,
    val possibleTrapFg: Color,
    val coasterBg: Color,
    val coasterFg: Color,
    val coasterBorder: Color,
) {
    val vertical: Vertical get() = if (isDrink) Vertical.DRINK else Vertical.FOOD
    val onSurface: Color get() = onBackground
}

val TopFoodLightPalette = TopFoodColors(
    isDrink = false,
    isDark = false,
    background = Color(0xFFFBF6EA),
    surface = Color(0xFFFFFFFF),
    surfaceElevated = Color(0xFFFAF8F5),
    sponsoredSurface = Color(0xFFF2EFE9),
    onBackground = Color(0xFF3A2418),
    onSurfaceMuted = Color(0xFF6E5649),
    border = Color(0xFFE6DFD5),
    inputBorder = Color(0xFFD6CFC5),
    primary = Color(0xFFB3261E),
    onPrimary = Color(0xFFFFFFFF),
    secondary = Color(0xFF3A2418),
    onSecondary = Color(0xFFFFFFFF),
    warning = Color(0xFFE0A526),
    onWarning = Color(0xFF3A2418),
    error = Color(0xFFB3261E),
    localnicBg = Color(0xFF2D5130),
    localnicFg = Color(0xFFFBF6EA),
    localnicSoft = Color(0x1F2D5130),
    turistFg = Color(0xFF5C4033),
    turistBorder = Color(0xFFA78452),
    trapBg = Color(0xFFB3261E),
    trapFg = Color(0xFFFFFFFF),
    possibleTrapBg = Color(0xFFE0A526),
    possibleTrapFg = Color(0xFF3A2418),
    coasterBg = Color(0xFFF4EEE2),
    coasterFg = Color(0xFF17382C),
    coasterBorder = Color(0xFFB98A5E),
)

val TopFoodDarkPalette = TopFoodColors(
    isDrink = false,
    isDark = true,
    background = Color(0xFF22262E),
    surface = Color(0xFF2B303A),
    surfaceElevated = Color(0xFF313743),
    sponsoredSurface = Color(0xFF272C35),
    onBackground = Color(0xFFF4EEE2),
    onSurfaceMuted = Color(0xFFB6BAC4),
    border = Color(0xFF3A4150),
    inputBorder = Color(0xFF495264),
    primary = Color(0xFFB3261E),
    onPrimary = Color(0xFFFFFFFF),
    secondary = Color(0xFFF4EEE2),
    onSecondary = Color(0xFF22262E),
    warning = Color(0xFFE0A526),
    onWarning = Color(0xFF3A2418),
    error = Color(0xFFFF7A70),
    localnicBg = Color(0xFF2D5130),
    localnicFg = Color(0xFFFBF6EA),
    localnicSoft = Color(0x2E2D5130),
    turistFg = Color(0xFFE3CDA6),
    turistBorder = Color(0xFFA78452),
    trapBg = Color(0xFFB3261E),
    trapFg = Color(0xFFFFFFFF),
    possibleTrapBg = Color(0xFFE0A526),
    possibleTrapFg = Color(0xFF3A2418),
    coasterBg = Color(0xFFF4EEE2),
    coasterFg = Color(0xFF17382C),
    coasterBorder = Color(0xFFB98A5E),
)

val TopDrinkPalette = TopFoodColors(
    isDrink = true,
    isDark = true,
    background = Color(0xFF17382C),
    surface = Color(0xFF1E4335),
    surfaceElevated = Color(0xFF122B22),
    sponsoredSurface = Color(0xFF1E4335),
    onBackground = Color(0xFFF4EEE2),
    onSurfaceMuted = Color(0xFFD8D0C2),
    border = Color(0xFF285443),
    inputBorder = Color(0xFF2D5947),
    primary = Color(0xFFF2A33A),
    onPrimary = Color(0xFF17382C),
    secondary = Color(0xFFF4EEE2),
    onSecondary = Color(0xFF17382C),
    warning = Color(0xFFF2A33A),
    onWarning = Color(0xFF17382C),
    error = Color(0xFFFF7A70),
    localnicBg = Color(0xFF2D5130),
    localnicFg = Color(0xFFFBF6EA),
    localnicSoft = Color(0x2E2D5130),
    turistFg = Color(0xFFE3CDA6),
    turistBorder = Color(0xFFE3CDA6),
    trapBg = Color(0xFFB3261E),
    trapFg = Color(0xFFFFFFFF),
    possibleTrapBg = Color(0xFFE0A526),
    possibleTrapFg = Color(0xFF3A2418),
    coasterBg = Color(0xFFF4EEE2),
    coasterFg = Color(0xFF17382C),
    coasterBorder = Color(0xFFB98A5E),
)

val LocalTopFoodColors = staticCompositionLocalOf { TopFoodLightPalette }

private val TopFoodTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = CondensedDisplayFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 34.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.5).sp,
    ),
    displayMedium = TextStyle(
        fontFamily = CondensedDisplayFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 28.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.4).sp,
    ),
    displaySmall = TextStyle(
        fontFamily = CondensedDisplayFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 23.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.3).sp,
    ),
    headlineLarge = TextStyle(
        fontFamily = CondensedDisplayFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 20.sp,
        lineHeight = 22.sp,
        letterSpacing = (-0.25).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = CondensedDisplayFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 20.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.25).sp,
    ),
    titleLarge = TextStyle(
        fontFamily = CondensedDisplayFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        lineHeight = 22.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 15.sp,
        lineHeight = 20.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 17.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 11.sp,
        lineHeight = 14.sp,
    ),
)

private val TopFoodShapes = Shapes(
    extraSmall = RoundedCornerShape(3.dp),
    small = RoundedCornerShape(4.dp),
    medium = RoundedCornerShape(4.dp),
    large = RoundedCornerShape(8.dp),
    extraLarge = RoundedCornerShape(12.dp),
)

@Composable
fun TopFoodTheme(
    vertical: Vertical,
    darkMode: Boolean,
    content: @Composable () -> Unit,
) {
    val palette = when {
        vertical == Vertical.DRINK -> TopDrinkPalette
        darkMode -> TopFoodDarkPalette
        else -> TopFoodLightPalette
    }

    val materialScheme = if (palette.isDark) {
        darkColorScheme(
            primary = palette.primary,
            onPrimary = palette.onPrimary,
            secondary = palette.secondary,
            onSecondary = palette.onSecondary,
            background = palette.background,
            onBackground = palette.onBackground,
            surface = palette.surface,
            onSurface = palette.onBackground,
            surfaceVariant = palette.surfaceElevated,
            onSurfaceVariant = palette.onSurfaceMuted,
            outline = palette.border,
            error = palette.error,
        )
    } else {
        lightColorScheme(
            primary = palette.primary,
            onPrimary = palette.onPrimary,
            secondary = palette.secondary,
            onSecondary = palette.onSecondary,
            background = palette.background,
            onBackground = palette.onBackground,
            surface = palette.surface,
            onSurface = palette.onBackground,
            surfaceVariant = palette.surfaceElevated,
            onSurfaceVariant = palette.onSurfaceMuted,
            outline = palette.border,
            error = palette.error,
        )
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            window.statusBarColor = palette.background.toArgb()
            window.navigationBarColor = palette.background.toArgb()
            val controller = WindowCompat.getInsetsController(window, view)
            controller.isAppearanceLightStatusBars = !palette.isDark
            controller.isAppearanceLightNavigationBars = !palette.isDark
        }
    }

    CompositionLocalProvider(LocalTopFoodColors provides palette) {
        MaterialTheme(
            colorScheme = materialScheme,
            typography = TopFoodTypography,
            shapes = TopFoodShapes,
            content = content,
        )
    }
}
