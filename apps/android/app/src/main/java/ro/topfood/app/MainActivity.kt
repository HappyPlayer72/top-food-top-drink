package ro.topfood.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.view.WindowCompat
import androidx.lifecycle.ViewModelProvider
import ro.topfood.app.ui.MainViewModel
import ro.topfood.app.ui.TopFoodAppShell
import ro.topfood.app.ui.theme.TopFoodTheme

class MainActivity : ComponentActivity() {
    private lateinit var mainViewModel: MainViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        mainViewModel = ViewModelProvider(this)[MainViewModel::class.java]
        mainViewModel.handleDeepLink(intent?.data)

        setContent {
            val state by mainViewModel.uiState.collectAsState()
            TopFoodTheme(
                vertical = state.vertical,
                darkMode = state.darkMode,
            ) {
                TopFoodAppShell(viewModel = mainViewModel)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        mainViewModel.handleDeepLink(intent.data)
    }
}
