package ro.topfood.app.ui

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ro.topfood.app.data.model.AdBanner
import ro.topfood.app.data.model.CityMetadata
import ro.topfood.app.data.model.DomainLogic
import ro.topfood.app.data.model.FoodHeroHeader
import ro.topfood.app.data.model.InterestSpec
import ro.topfood.app.data.model.LeaderboardEntry
import ro.topfood.app.data.model.LoyaltyProgram
import ro.topfood.app.data.model.MonthlyAwards
import ro.topfood.app.data.model.NavSection
import ro.topfood.app.data.model.OutingPoll
import ro.topfood.app.data.model.PublicVoteCategoryTop
import ro.topfood.app.data.model.Restaurant
import ro.topfood.app.data.model.Review
import ro.topfood.app.data.model.ReviewQuestionSpec
import ro.topfood.app.data.model.SortOrder
import ro.topfood.app.data.model.TasteTourResult
import ro.topfood.app.data.model.TopReviewer
import ro.topfood.app.data.model.UserAccount
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.data.model.WeekendEvent
import ro.topfood.app.data.repository.RepoResult
import ro.topfood.app.data.repository.TopFoodRepository
import java.util.UUID

data class MainUiState(
    val vertical: Vertical = Vertical.FOOD,
    val navSection: NavSection = NavSection.TOP,
    val darkMode: Boolean = false,
    val backendOnline: Boolean = false,
    val isSyncing: Boolean = false,
    val apiBaseUrl: String = "http://10.0.2.2:3000",
    val city: CityMetadata = CityMetadata(),
    val foodVenues: List<Restaurant> = emptyList(),
    val drinkVenues: List<Restaurant> = emptyList(),
    val foodAds: List<AdBanner> = emptyList(),
    val drinkAds: List<AdBanner> = emptyList(),
    val weekendEvents: List<WeekendEvent> = emptyList(),
    val topReviewers: List<TopReviewer> = emptyList(),
    val foodHeroHeaders: List<FoodHeroHeader> = emptyList(),
    val drinkHeroHeaders: List<String> = emptyList(),
    val heroIndex: Int = 0,
    val questions: List<ReviewQuestionSpec> = emptyList(),
    val interests: List<InterestSpec> = emptyList(),

    // Filters & Search
    val searchQuery: String = "",
    val foodFilters: Set<String> = emptySet(),
    val drinkFilters: Set<String> = setOf("vineri-noaptea"),
    val selectedNeighborhood: String = "all",
    val selectedCategory: String? = null,
    val sortOrder: SortOrder = SortOrder.HONEST,

    // Map State
    val mapSelectedTaste: String? = null,
    val mapShowTouristZones: Boolean = true,
    val mapFocusSlug: String? = null,

    // Monthly Top & Public Votes
    val selectedMonth: String = "2026-11",
    val availableMonths: List<String> = listOf("2026-11", "2026-10"),
    val publicVoteCategories: Map<String, Map<String, List<PublicVoteCategoryTop>>> = emptyMap(),
    val monthlyAwards: Map<Vertical, MonthlyAwards> = emptyMap(),
    val leaderboardEntries: Map<Vertical, List<LeaderboardEntry>> = emptyMap(),
    val voteCountsByMonthKey: Map<String, Map<String, Map<String, Int>>> = emptyMap(),
    val myVotesByMonthKey: Map<String, Map<String, String>> = emptyMap(),

    // Scarnavii
    val activeOutingPoll: OutingPoll? = null,
    val activeTasteTour: TasteTourResult? = null,

    // Loyalty
    val loyaltyPrograms: List<LoyaltyProgram> = emptyList(),

    // Account, Modals & Feedback
    val currentUser: UserAccount? = null,
    val savedSlugs: Set<String> = emptySet(),
    val localCheckinDays: Int = 0,
    val selectedVenueSlug: String? = null,
    val showAccountSheet: Boolean = false,
    val showAddVenueDialog: Boolean = false,
    val statusMessage: String? = null,
) {
    val activeVenues: List<Restaurant>
        get() = if (vertical == Vertical.DRINK) drinkVenues else foodVenues

    val allVenues: List<Restaurant>
        get() = foodVenues + drinkVenues

    val selectedVenue: Restaurant?
        get() = selectedVenueSlug?.let { slug -> allVenues.find { it.slug == slug || it.id == slug } }

    val savedVenues: List<Restaurant>
        get() = allVenues.filter { it.slug in savedSlugs || it.id in savedSlugs }

    val filteredVenues: List<Restaurant>
        get() = DomainLogic.filterAndSortVenues(
            venues = activeVenues,
            vertical = vertical,
            searchQuery = searchQuery,
            foodFilters = foodFilters,
            drinkFilters = drinkFilters,
            selectedNeighborhood = selectedNeighborhood,
            selectedCategory = selectedCategory,
            sortOrder = sortOrder,
        )

    val eligibleSponsored: List<Restaurant>
        get() = DomainLogic.eligibleSponsoredVenues(activeVenues)
}

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = TopFoodRepository(application)
    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    val demoUsers: List<UserAccount> get() = repo.demoUsers

    init {
        val seed = repo.loadSeedCatalog()
        val initial = repo.loadInitialState()
        _uiState.value = MainUiState(
            city = initial.city,
            foodVenues = initial.foodVenues,
            drinkVenues = initial.drinkVenues,
            weekendEvents = initial.weekendEvents,
            topReviewers = initial.topReviewers,
            foodHeroHeaders = initial.foodHeroHeaders,
            drinkHeroHeaders = initial.drinkHeroHeaders,
            questions = seed.questions,
            interests = seed.interests,
            publicVoteCategories = initial.publicVoteCategories,
            loyaltyPrograms = initial.loyaltyPrograms,
            savedSlugs = initial.savedSlugs,
            darkMode = initial.darkMode,
            currentUser = initial.currentUser,
            apiBaseUrl = initial.apiBaseUrl,
            voteCountsByMonthKey = initial.localVoteCounts,
            myVotesByMonthKey = initial.localMyVotes,
            localCheckinDays = initial.localCheckinDays,
        )
        refreshLiveBackend()
    }

    fun refreshLiveBackend() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true) }
            val bundle = repo.syncLiveCatalog()
            val loyaltyLive = if (bundle.backendOnline) repo.fetchLoyaltyPrograms() else null
            val foodLb = if (bundle.backendOnline) repo.fetchLeaderboard(Vertical.FOOD, _uiState.value.selectedMonth) else null
            val drinkLb = if (bundle.backendOnline) repo.fetchLeaderboard(Vertical.DRINK, _uiState.value.selectedMonth) else null

            _uiState.update { state ->
                val updatedCounts = state.voteCountsByMonthKey.toMutableMap()
                val updatedMine = state.myVotesByMonthKey.toMutableMap()
                if (foodLb != null) {
                    val key = "${state.selectedMonth}:food"
                    updatedCounts[key] = foodLb.countsByCategory
                    updatedMine[key] = foodLb.myVotesByCategory
                }
                if (drinkLb != null) {
                    val key = "${state.selectedMonth}:drink"
                    updatedCounts[key] = drinkLb.countsByCategory
                    updatedMine[key] = drinkLb.myVotesByCategory
                }
                val newAwards = state.monthlyAwards.toMutableMap()
                if (foodLb != null) newAwards[Vertical.FOOD] = foodLb.awards
                if (drinkLb != null) newAwards[Vertical.DRINK] = drinkLb.awards

                val newEntries = state.leaderboardEntries.toMutableMap()
                if (foodLb != null) newEntries[Vertical.FOOD] = foodLb.entries
                if (drinkLb != null) newEntries[Vertical.DRINK] = drinkLb.entries

                state.copy(
                    backendOnline = bundle.backendOnline,
                    isSyncing = false,
                    foodVenues = bundle.foodVenues ?: state.foodVenues,
                    drinkVenues = bundle.drinkVenues ?: state.drinkVenues,
                    foodAds = bundle.adsFood,
                    drinkAds = bundle.adsDrink,
                    weekendEvents = bundle.events ?: state.weekendEvents,
                    topReviewers = bundle.reviewers ?: state.topReviewers,
                    loyaltyPrograms = loyaltyLive ?: state.loyaltyPrograms,
                    monthlyAwards = newAwards,
                    leaderboardEntries = newEntries,
                    voteCountsByMonthKey = updatedCounts,
                    myVotesByMonthKey = updatedMine,
                )
            }
        }
    }

    fun clearStatusMessage() {
        _uiState.update { it.copy(statusMessage = null) }
    }

    fun showStatus(msg: String) {
        _uiState.update { it.copy(statusMessage = msg) }
    }

    fun setVertical(v: Vertical) {
        _uiState.update {
            it.copy(
                vertical = v,
                selectedCategory = null,
                selectedNeighborhood = "all",
                searchQuery = "",
            )
        }
    }

    fun setNavSection(section: NavSection) {
        _uiState.update { it.copy(navSection = section) }
    }

    fun toggleDarkMode() {
        val next = !_uiState.value.darkMode
        repo.persistDarkMode(next)
        _uiState.update { it.copy(darkMode = next) }
    }

    fun setSearchQuery(q: String) {
        _uiState.update { it.copy(searchQuery = q) }
    }

    fun toggleFoodFilter(id: String) {
        _uiState.update {
            val next = it.foodFilters.toMutableSet()
            if (!next.add(id)) next.remove(id)
            it.copy(foodFilters = next)
        }
    }

    fun toggleDrinkFilter(id: String) {
        _uiState.update {
            val next = it.drinkFilters.toMutableSet()
            if (!next.add(id)) next.remove(id)
            it.copy(drinkFilters = next)
        }
    }

    fun setSelectedNeighborhood(neighborhood: String) {
        _uiState.update { it.copy(selectedNeighborhood = neighborhood) }
    }

    fun setSelectedCategory(category: String?) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    fun setSortOrder(order: SortOrder) {
        _uiState.update { it.copy(sortOrder = order) }
    }

    fun resetFilters() {
        _uiState.update {
            it.copy(
                searchQuery = "",
                foodFilters = emptySet(),
                drinkFilters = emptySet(),
                selectedNeighborhood = "all",
                selectedCategory = null,
                sortOrder = SortOrder.HONEST,
            )
        }
    }

    fun openVenueDetail(slug: String) {
        _uiState.update { it.copy(selectedVenueSlug = slug) }
        val state = _uiState.value
        if (state.backendOnline) {
            viewModelScope.launch {
                val fresh = repo.fetchVenueDetail(slug, state.vertical) ?: return@launch
                updateVenueInState(fresh)
            }
        }
    }

    fun closeVenueDetail() {
        _uiState.update { it.copy(selectedVenueSlug = null) }
    }

    fun locateVenueOnMap(venue: Restaurant) {
        _uiState.update {
            it.copy(
                selectedVenueSlug = null,
                vertical = if (venue.vertical == "drink") Vertical.DRINK else Vertical.FOOD,
                navSection = NavSection.MAP,
                mapFocusSlug = venue.slug,
            )
        }
    }

    fun setMapTaste(tasteId: String?) {
        _uiState.update { it.copy(mapSelectedTaste = if (it.mapSelectedTaste == tasteId) null else tasteId) }
    }

    fun toggleMapTouristZones() {
        _uiState.update { it.copy(mapShowTouristZones = !it.mapShowTouristZones) }
    }

    fun setMapFocusSlug(slug: String?) {
        _uiState.update { it.copy(mapFocusSlug = slug) }
    }

    fun toggleSaveVenue(slug: String) {
        val current = _uiState.value.savedSlugs
        val shouldSave = slug !in current
        val next = current.toMutableSet().apply {
            if (shouldSave) add(slug) else remove(slug)
        }
        repo.persistSavedSlugs(next)
        _uiState.update {
            it.copy(
                savedSlugs = next,
                statusMessage = if (shouldSave) "Salvat în lista ta!" else "Eliminat din salvate.",
            )
        }
        if (_uiState.value.backendOnline) {
            viewModelScope.launch { repo.toggleSaveVenue(slug, shouldSave, true) }
        }
    }

    // ---------- Auth & Account ----------

    fun openAccountSheet() {
        _uiState.update { it.copy(showAccountSheet = true) }
    }

    fun closeAccountSheet() {
        _uiState.update { it.copy(showAccountSheet = false) }
    }

    fun loginDemo(email: String) {
        viewModelScope.launch {
            when (val res = repo.loginDemo(email)) {
                is RepoResult.Success -> {
                    _uiState.update {
                        it.copy(
                            currentUser = res.data,
                            showAccountSheet = false,
                            statusMessage = res.message,
                        )
                    }
                    refreshLiveBackend()
                }
                is RepoResult.Error -> _uiState.update { it.copy(statusMessage = res.message) }
            }
        }
    }

    fun loginWithCredentials(loginInput: String, password: String) {
        viewModelScope.launch {
            when (val res = repo.login(loginInput, password)) {
                is RepoResult.Success -> {
                    _uiState.update {
                        it.copy(
                            currentUser = res.data,
                            showAccountSheet = false,
                            statusMessage = res.message,
                        )
                    }
                    refreshLiveBackend()
                }
                is RepoResult.Error -> _uiState.update { it.copy(statusMessage = res.message) }
            }
        }
    }

    fun registerAccount(name: String, email: String, password: String, interests: List<String>) {
        viewModelScope.launch {
            when (val res = repo.register(name, email, password, interests)) {
                is RepoResult.Success -> {
                    _uiState.update {
                        it.copy(
                            currentUser = res.data,
                            showAccountSheet = false,
                            statusMessage = res.message,
                        )
                    }
                }
                is RepoResult.Error -> _uiState.update { it.copy(statusMessage = res.message) }
            }
        }
    }

    fun logout() {
        repo.logout()
        _uiState.update {
            it.copy(
                currentUser = null,
                statusMessage = "Te-ai deconectat.",
            )
        }
    }

    fun updateApiBaseUrl(newUrl: String) {
        repo.updateApiBaseUrl(newUrl)
        _uiState.update {
            it.copy(
                apiBaseUrl = newUrl.trim().trimEnd('/'),
                statusMessage = "URL API actualizat. Se verifică conexiunea...",
            )
        }
        refreshLiveBackend()
    }

    fun checkInCityLocal() {
        val user = _uiState.value.currentUser ?: return
        viewModelScope.launch {
            val (days, updatedUser) = repo.checkInCityLocal(user, _uiState.value.backendOnline)
            val becameLocal = updatedUser.role == "verified-local" && user.role != "verified-local"
            _uiState.update {
                it.copy(
                    currentUser = updatedUser,
                    localCheckinDays = days,
                    statusMessage = if (becameLocal) {
                        "Felicitări! Ești Localnic verificat Timișoara (pondere 2,0×)."
                    } else {
                        "Check-in salvat ($days / 3 zile în Timișoara)."
                    },
                )
            }
        }
    }

    fun startUniEmail(email: String, onMessage: (String) -> Unit) {
        viewModelScope.launch {
            when (val res = repo.startUniEmailVerification(email, _uiState.value.backendOnline)) {
                is RepoResult.Success -> onMessage(res.data)
                is RepoResult.Error -> onMessage(res.message)
            }
        }
    }

    fun confirmUniEmail(code: String) {
        val user = _uiState.value.currentUser ?: return
        viewModelScope.launch {
            when (val res = repo.confirmUniEmailVerification(code, user, _uiState.value.backendOnline)) {
                is RepoResult.Success -> _uiState.update {
                    it.copy(currentUser = res.data, statusMessage = res.message)
                }
                is RepoResult.Error -> _uiState.update { it.copy(statusMessage = res.message) }
            }
        }
    }

    // ---------- Reviews, Crowd, Videos ----------

    fun submitReview(
        venue: Restaurant,
        foodScore: Int,
        trapEstimatePct: Int,
        text: String,
        praisedEmployee: String?,
        safetyScore: Int?,
        noiseLevel: String?,
        answers: Map<String, String>,
        gpsVerified: Boolean,
    ) {
        val user = _uiState.value.currentUser
        if (user == null) {
            _uiState.update {
                it.copy(
                    showAccountSheet = true,
                    statusMessage = "Intră în cont ca să publici un review.",
                )
            }
            return
        }
        if (text.trim().length < 8) {
            _uiState.update { it.copy(statusMessage = "Scrie măcar câteva cuvinte despre experiență (min. 8 caractere).") }
            return
        }

        viewModelScope.launch {
            when (
                val res = repo.submitReview(
                    venue = venue,
                    user = user,
                    foodScore = foodScore,
                    trapEstimatePct = trapEstimatePct,
                    text = text,
                    praisedEmployee = praisedEmployee,
                    safetyScore = safetyScore,
                    noiseLevel = noiseLevel,
                    answers = answers,
                    gpsVerified = gpsVerified,
                    backendOnline = _uiState.value.backendOnline,
                )
            ) {
                is RepoResult.Success -> {
                    val updated = DomainLogic.recalculateVenueWithReview(venue, res.data)
                    updateVenueInState(updated)
                    _uiState.update { it.copy(statusMessage = res.message ?: "Review publicat!") }
                }
                is RepoResult.Error -> _uiState.update { it.copy(statusMessage = res.message) }
            }
        }
    }

    fun editOwnReview(venue: Restaurant, reviewId: String, newScore: Double, newText: String) {
        val updated = DomainLogic.recalculateVenueWithUpdatedReview(venue, reviewId, newScore, newText)
        updateVenueInState(updated)
        _uiState.update { it.copy(statusMessage = "Review actualizat!") }
        viewModelScope.launch {
            repo.editReview(reviewId, newScore.toInt(), newText, _uiState.value.backendOnline)
        }
    }

    fun deleteOwnReview(venue: Restaurant, reviewId: String) {
        val updated = DomainLogic.recalculateVenueWithoutReview(venue, reviewId)
        updateVenueInState(updated)
        _uiState.update { it.copy(statusMessage = "Review șters.") }
        viewModelScope.launch {
            repo.deleteReview(reviewId, _uiState.value.backendOnline)
        }
    }

    fun voteHelpful(venue: Restaurant, review: Review) {
        val revId = review.id ?: return
        val localNext = review.helpfulCount + 1
        val updatedReviews = venue.reviews.map {
            if (it.id == revId) it.copy(helpfulCount = localNext) else it
        }
        updateVenueInState(venue.copy(reviews = updatedReviews))

        if (_uiState.value.backendOnline) {
            viewModelScope.launch {
                val serverCount = repo.toggleHelpful(revId, true)
                if (serverCount != null) {
                    val syncedReviews = venue.reviews.map {
                        if (it.id == revId) it.copy(helpfulCount = serverCount) else it
                    }
                    updateVenueInState(venue.copy(reviews = syncedReviews))
                }
            }
        }
    }

    fun reportCrowd(venue: Restaurant, segments: Int, label: String) {
        updateVenueInState(venue.copy(crowdSegments = segments, crowdLabel = label))
        _uiState.update { it.copy(statusMessage = "Mulțumim! Vibe actualizat: $label") }
        viewModelScope.launch {
            repo.reportCrowd(venue.slug, segments, _uiState.value.backendOnline)
        }
    }

    fun castQuickVote(venue: Restaurant, kind: String, value: Int) {
        viewModelScope.launch {
            repo.quickVote(venue.slug, kind, value, _uiState.value.backendOnline)
            _uiState.update { it.copy(statusMessage = "Vot rapid înregistrat!") }
        }
    }

    fun submitVenueVideo(venue: Restaurant, url: String) {
        val trimmed = url.trim()
        if (trimmed.isBlank()) return
        val platform = when {
            trimmed.contains("tiktok", true) -> "tiktok"
            trimmed.contains("instagram", true) -> "instagram"
            trimmed.contains("youtube", true) || trimmed.contains("youtu.be", true) -> "youtube"
            else -> "facebook"
        }
        val newVideo = ro.topfood.app.data.model.VenueVideo(
            url = trimmed,
            platform = platform,
            dishes = emptyList(),
            prices = emptyList(),
            isPaid = false,
            adSignal = "organic",
            sentiment = "positive",
        )
        updateVenueInState(venue.copy(videos = listOf(newVideo) + venue.videos))
        _uiState.update { it.copy(statusMessage = "Link video trimis spre analiză!") }
        viewModelScope.launch {
            repo.submitVideo(venue.slug, trimmed, _uiState.value.backendOnline)
        }
    }

    fun openAddVenueDialog() {
        _uiState.update { it.copy(showAddVenueDialog = true) }
    }

    fun closeAddVenueDialog() {
        _uiState.update { it.copy(showAddVenueDialog = false) }
    }

    fun submitNewVenue(name: String, address: String, neighborhood: String) {
        viewModelScope.launch {
            val res = repo.submitNewVenue(
                vertical = _uiState.value.vertical,
                name = name,
                address = address,
                neighborhood = neighborhood,
                backendOnline = _uiState.value.backendOnline,
            )
            when (res) {
                is RepoResult.Success -> _uiState.update {
                    it.copy(showAddVenueDialog = false, statusMessage = res.data)
                }
                is RepoResult.Error -> _uiState.update {
                    it.copy(statusMessage = res.message)
                }
            }
        }
    }

    // ---------- Monthly Top & Votes ----------

    fun selectMonth(month: String) {
        _uiState.update { it.copy(selectedMonth = month) }
        if (_uiState.value.backendOnline) {
            viewModelScope.launch {
                val lb = repo.fetchLeaderboard(_uiState.value.vertical, month) ?: return@launch
                _uiState.update { state ->
                    val key = "$month:${state.vertical.apiValue}"
                    state.copy(
                        monthlyAwards = state.monthlyAwards + (state.vertical to lb.awards),
                        leaderboardEntries = state.leaderboardEntries + (state.vertical to lb.entries),
                        voteCountsByMonthKey = state.voteCountsByMonthKey + (key to lb.countsByCategory),
                        myVotesByMonthKey = state.myVotesByMonthKey + (key to lb.myVotesByCategory),
                    )
                }
            }
        }
    }

    fun castMonthlyVote(categoryId: String, venueSlug: String, venueName: String) {
        val state = _uiState.value
        val user = state.currentUser
        if (user == null) {
            _uiState.update {
                it.copy(showAccountSheet = true, statusMessage = "Intră în cont ca să votezi în Topul lunii.")
            }
            return
        }
        val activeMonth = state.availableMonths.firstOrNull() ?: "2026-11"
        if (state.selectedMonth != activeMonth) {
            _uiState.update { it.copy(statusMessage = "Votul pentru această lună s-a încheiat.") }
            return
        }
        val monthKey = "${state.selectedMonth}:${state.vertical.apiValue}"
        val myVotes = state.myVotesByMonthKey[monthKey].orEmpty()
        if (myVotes.containsKey(categoryId)) {
            _uiState.update { it.copy(statusMessage = "Ai votat deja în această secțiune luna aceasta.") }
            return
        }

        viewModelScope.launch {
            val apiRes = repo.castMonthlyVote(
                vertical = state.vertical,
                month = state.selectedMonth,
                activeMonth = activeMonth,
                categoryId = categoryId,
                venueSlug = venueSlug,
                venueName = venueName,
                backendOnline = state.backendOnline,
            )
            if (apiRes is RepoResult.Success) {
                val (counts, mine) = apiRes.data
                _uiState.update { s ->
                    s.copy(
                        voteCountsByMonthKey = s.voteCountsByMonthKey + (monthKey to counts),
                        myVotesByMonthKey = s.myVotesByMonthKey + (monthKey to mine),
                        statusMessage = apiRes.message,
                    )
                }
                return@launch
            }

            // Local vote storage fallback
            val updatedCounts = state.voteCountsByMonthKey.toMutableMap()
            val catMap = (updatedCounts[monthKey] ?: emptyMap()).toMutableMap()
            val slugMap = (catMap[categoryId] ?: emptyMap()).toMutableMap()
            slugMap[venueSlug] = (slugMap[venueSlug] ?: 0) + 1
            catMap[categoryId] = slugMap
            updatedCounts[monthKey] = catMap

            val updatedMine = state.myVotesByMonthKey.toMutableMap()
            val userCats = (updatedMine[monthKey] ?: emptyMap()).toMutableMap()
            userCats[categoryId] = venueSlug
            updatedMine[monthKey] = userCats

            repo.persistLocalVotes(updatedCounts, updatedMine)
            _uiState.update { s ->
                s.copy(
                    voteCountsByMonthKey = updatedCounts,
                    myVotesByMonthKey = updatedMine,
                    statusMessage = "Vot înregistrat pentru $venueName!",
                )
            }
        }
    }

    // ---------- Scarnavii (Taste Tour & Outing Poll) ----------

    fun buildTasteTour(queryText: String, selectedCats: List<String>, budgetRon: Double, stopCount: Int) {
        val parsed = if (selectedCats.isNotEmpty()) selectedCats else DomainLogic.parseTasteCravings(queryText)
        if (parsed.isEmpty()) {
            _uiState.update {
                it.copy(
                    activeTasteTour = null,
                    statusMessage = "Spune-ne ce ai poftă (ex: pizza, burger, ciorbă, cafea, bere, desert) sau bifează din categorii.",
                )
            }
            return
        }
        val pool = _uiState.value.allVenues
        val tour = DomainLogic.computeWalkingTasteTour(
            restaurants = pool,
            selectedCategories = parsed.take(stopCount),
            budgetRon = budgetRon,
            stopCount = stopCount,
            start = _uiState.value.city.center,
        )
        _uiState.update {
            it.copy(
                activeTasteTour = tour,
                statusMessage = if (tour == null) "Nu am găsit un traseu în bugetul ales. Mărește bugetul sau schimbă opririle." else null,
            )
        }
    }

    fun createOutingPoll(venueSlugs: List<String>) {
        if (venueSlugs.size !in 2..4) {
            _uiState.update { it.copy(statusMessage = "Alege între 2 și 4 localuri pentru sondaj.") }
            return
        }
        viewModelScope.launch {
            val poll = repo.createOutingPoll(venueSlugs, _uiState.value.backendOnline)
            _uiState.update {
                it.copy(
                    activeOutingPoll = poll,
                    statusMessage = "Sondaj creat! Îl poți trimite prietenilor.",
                )
            }
        }
    }

    fun voteInOutingPoll(venueSlug: String) {
        val poll = _uiState.value.activeOutingPoll ?: return
        viewModelScope.launch {
            val updated = repo.voteOutingPoll(poll, venueSlug, _uiState.value.backendOnline)
            _uiState.update { it.copy(activeOutingPoll = updated) }
        }
    }

    fun clearOutingPoll() {
        _uiState.update { it.copy(activeOutingPoll = null) }
    }

    // ---------- Loyalty Cards ----------

    fun stampLoyaltyProgram(programId: String, rawQrCode: String? = null) {
        val user = _uiState.value.currentUser
        if (user == null) {
            _uiState.update {
                it.copy(showAccountSheet = true, statusMessage = "Intră în cont ca să strângi ștampile.")
            }
            return
        }
        viewModelScope.launch {
            val apiRes = repo.scanLoyaltyCode(programId, rawQrCode, _uiState.value.backendOnline)
            if (apiRes is RepoResult.Success) {
                val refreshed = repo.fetchLoyaltyPrograms()
                _uiState.update {
                    it.copy(
                        loyaltyPrograms = refreshed ?: it.loyaltyPrograms,
                        statusMessage = apiRes.data,
                    )
                }
                return@launch
            }

            val updated = _uiState.value.loyaltyPrograms.map { prog ->
                val matches = prog.id == programId || (!rawQrCode.isNullOrBlank() && rawQrCode.startsWith(prog.id))
                if (!matches) return@map prog
                if (prog.stampsCollected + 1 >= prog.stampsRequired) {
                    prog.copy(stampsCollected = 0, redeemedCount = prog.redeemedCount + 1)
                } else {
                    prog.copy(stampsCollected = prog.stampsCollected + 1)
                }
            }
            val target = updated.find { it.id == programId || (!rawQrCode.isNullOrBlank() && rawQrCode.startsWith(it.id)) }
            repo.persistLoyaltyPrograms(updated)
            _uiState.update {
                it.copy(
                    loyaltyPrograms = updated,
                    statusMessage = when {
                        target == null -> "Codul scanat nu corespunde niciunui card."
                        target.stampsCollected == 0 -> "Felicitări! Recompensă deblocată la ${target.venueName}: ${target.rewardTitle}"
                        else -> "+1 ștampilă la ${target.venueName} (${target.stampsCollected}/${target.stampsRequired})."
                    },
                )
            }
        }
    }

    fun createPersonalLoyaltyCard(venueName: String, rewardTitle: String, stampsRequired: Int, iconId: String) {
        if (venueName.trim().length < 2 || rewardTitle.trim().length < 2) {
            _uiState.update { it.copy(statusMessage = "Completează numele localului și recompensa.") }
            return
        }
        val newCard = LoyaltyProgram(
            id = "custom-${UUID.randomUUID().toString().take(8)}",
            venueName = venueName.trim(),
            neighborhood = "Card personal",
            rewardTitle = rewardTitle.trim(),
            stampsRequired = stampsRequired.coerceIn(3, 12),
            iconId = iconId,
            accentColor = if (_uiState.value.vertical == Vertical.DRINK) "#17382C" else "#B3261E",
            stampsCollected = 1,
            redeemedCount = 0,
            qrSeed = "TOPFOOD:PERSONAL:${UUID.randomUUID().toString().take(6)}",
            isCustomVendor = true,
        )
        val updated = listOf(newCard) + _uiState.value.loyaltyPrograms
        repo.persistLoyaltyPrograms(updated)
        _uiState.update {
            it.copy(
                loyaltyPrograms = updated,
                statusMessage = "Card personal creat cu prima ștampilă!",
            )
        }
        viewModelScope.launch {
            repo.createPersonalCard(
                venueName.trim(),
                rewardTitle.trim(),
                stampsRequired,
                iconId,
                _uiState.value.backendOnline,
            )
        }
    }

    // ---------- Deep Links ----------

    fun handleDeepLink(uri: Uri?) {
        uri ?: return
        val segments = uri.pathSegments ?: emptyList()
        when {
            uri.scheme == "topfood" && uri.host == "venue" -> {
                segments.firstOrNull()?.let { openVenueDetail(it) }
            }
            segments.firstOrNull() == "topdrink" -> {
                setVertical(Vertical.DRINK)
                when {
                    segments.size >= 3 && segments[2] == "top-luna" -> setNavSection(NavSection.MONTHLY)
                    segments.size >= 3 && segments[2] != "categorie" -> openVenueDetail(segments[2])
                }
            }
            segments.firstOrNull() == "topfood" -> {
                setVertical(Vertical.FOOD)
                when {
                    segments.size >= 3 && segments[2] == "top-luna" -> setNavSection(NavSection.MONTHLY)
                    segments.size >= 3 && segments[2] != "categorie" -> openVenueDetail(segments[2])
                }
            }
            segments.firstOrNull() == "harta" -> setNavSection(NavSection.MAP)
            segments.firstOrNull() == "unde-iesim" -> {
                setNavSection(NavSection.SCARNAVII)
                _uiState.update { it.copy(statusMessage = "Deschis secțiunea Scârnăvii · Sondaj Unde ieșim?") }
            }
        }
    }

    private fun updateVenueInState(updated: Restaurant) {
        _uiState.update { state ->
            state.copy(
                foodVenues = state.foodVenues.map { if (it.id == updated.id || it.slug == updated.slug) updated else it },
                drinkVenues = state.drinkVenues.map { if (it.id == updated.id || it.slug == updated.slug) updated else it },
            )
        }
    }
}
