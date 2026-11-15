package ro.topfood.app.data.repository

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import ro.topfood.app.BuildConfig
import ro.topfood.app.data.model.AdBanner
import ro.topfood.app.data.model.CityMetadata
import ro.topfood.app.data.model.Coordinates
import ro.topfood.app.data.model.DomainLogic
import ro.topfood.app.data.model.FoodHeroHeader
import ro.topfood.app.data.model.LeaderboardEntry
import ro.topfood.app.data.model.LoyaltyProgram
import ro.topfood.app.data.model.MonthlyAwards
import ro.topfood.app.data.model.OutingPoll
import ro.topfood.app.data.model.PublicVoteCategoryTop
import ro.topfood.app.data.model.Restaurant
import ro.topfood.app.data.model.Review
import ro.topfood.app.data.model.TimisoaraSeedCatalog
import ro.topfood.app.data.model.TopReviewer
import ro.topfood.app.data.model.UserAccount
import ro.topfood.app.data.model.Vertical
import ro.topfood.app.data.model.WeekendEvent
import ro.topfood.app.data.network.AddVenueRequest
import ro.topfood.app.data.network.ApiClientHolder
import ro.topfood.app.data.network.CheckinRequest
import ro.topfood.app.data.network.CreatePersonalCardRequest
import ro.topfood.app.data.network.CreatePollRequest
import ro.topfood.app.data.network.DemoLoginRequest
import ro.topfood.app.data.network.EditReviewRequest
import ro.topfood.app.data.network.EmailConfirmRequest
import ro.topfood.app.data.network.EmailStartRequest
import ro.topfood.app.data.network.LocalCheckinRequest
import ro.topfood.app.data.network.LoginRequest
import ro.topfood.app.data.network.LoyaltyScanRequest
import ro.topfood.app.data.network.MonthlyVoteRequest
import ro.topfood.app.data.network.PollVoteRequest
import ro.topfood.app.data.network.QuickVoteRequest
import ro.topfood.app.data.network.RegisterRequest
import ro.topfood.app.data.network.VibeRequest
import ro.topfood.app.data.network.VideoSubmitRequest
import ro.topfood.app.data.network.WriteReviewRequest
import java.util.UUID

sealed class RepoResult<out T> {
    data class Success<T>(val data: T, val message: String? = null) : RepoResult<T>()
    data class Error(val message: String) : RepoResult<Nothing>()
}

data class InitialPlatformState(
    val city: CityMetadata,
    val foodVenues: List<Restaurant>,
    val drinkVenues: List<Restaurant>,
    val weekendEvents: List<WeekendEvent>,
    val topReviewers: List<TopReviewer>,
    val foodHeroHeaders: List<FoodHeroHeader>,
    val drinkHeroHeaders: List<String>,
    val publicVoteCategories: Map<String, Map<String, List<PublicVoteCategoryTop>>>,
    val loyaltyPrograms: List<LoyaltyProgram>,
    val savedSlugs: Set<String>,
    val darkMode: Boolean,
    val currentUser: UserAccount?,
    val apiBaseUrl: String,
    val localVoteCounts: Map<String, Map<String, Map<String, Int>>>,
    val localMyVotes: Map<String, Map<String, String>>,
    val localCheckinDays: Int,
)

class TopFoodRepository(context: Context) {
    private val appContext = context.applicationContext
    private val gson = Gson()
    private val prefs = appContext.getSharedPreferences("topfood_prefs_v1", Context.MODE_PRIVATE)
    private val clientHolder = ApiClientHolder(
        prefs.getString(KEY_API_BASE_URL, BuildConfig.DEFAULT_API_BASE_URL)
            ?: BuildConfig.DEFAULT_API_BASE_URL
    )

    init {
        clientHolder.bearerToken = prefs.getString(KEY_BEARER_TOKEN, null)
        clientHolder.voterToken = prefs.getString(KEY_VOTER_TOKEN, null)
    }

    val demoUsers: List<UserAccount> = listOf(
        UserAccount(
            id = "andreea-m",
            username = "andreea_m",
            name = "Andreea M.",
            email = "andreea@e-uvt.ro",
            role = "verified-local",
            neighborhood = "Iosefin",
            weightMultiplier = 2.0,
            description = "Cont verificat Timișoara · review-urile tale au pondere 2,0×.",
        ),
        UserAccount(
            id = "luca-t",
            username = "luca_t",
            name = "Luca T.",
            email = "luca@visit.ro",
            role = "tourist",
            weightMultiplier = 1.0,
            description = "Cont de vizitator · review-urile tale contribuie la Scorul Turiștilor (1,0×).",
        ),
    )

    private var cachedCatalog: TimisoaraSeedCatalog? = null

    fun loadSeedCatalog(): TimisoaraSeedCatalog {
        cachedCatalog?.let { return it }
        val json = appContext.assets.open("timisoara_catalog.json").bufferedReader().use { it.readText() }
        val parsed = gson.fromJson(json, TimisoaraSeedCatalog::class.java)
        cachedCatalog = parsed
        return parsed
    }

    fun loadInitialState(): InitialPlatformState {
        val seed = loadSeedCatalog()
        val savedSlugs = prefs.getStringSet(KEY_SAVED_SLUGS, setOf("restaurant-nora")) ?: setOf("restaurant-nora")
        val darkMode = prefs.getBoolean(KEY_DARK_MODE, false)
        val userJson = prefs.getString(KEY_USER_JSON, null)
        val user = userJson?.let { runCatching { gson.fromJson(it, UserAccount::class.java) }.getOrNull() }
        val loyaltyJson = prefs.getString(KEY_LOYALTY_JSON, null)
        val storedPrograms: List<LoyaltyProgram> = loyaltyJson?.let {
            runCatching {
                val type = object : TypeToken<List<LoyaltyProgram>>() {}.type
                gson.fromJson<List<LoyaltyProgram>>(it, type)
            }.getOrNull()
        } ?: seed.defaultLoyaltyPrograms

        val countsJson = prefs.getString(KEY_LOCAL_VOTE_COUNTS, null)
        val voteCounts: Map<String, Map<String, Map<String, Int>>> = countsJson?.let {
            runCatching {
                val type = object : TypeToken<Map<String, Map<String, Map<String, Int>>>>() {}.type
                gson.fromJson<Map<String, Map<String, Map<String, Int>>>>(it, type)
            }.getOrNull()
        } ?: emptyMap()

        val myVotesJson = prefs.getString(KEY_LOCAL_MY_VOTES, null)
        val myVotes: Map<String, Map<String, String>> = myVotesJson?.let {
            runCatching {
                val type = object : TypeToken<Map<String, Map<String, String>>>() {}.type
                gson.fromJson<Map<String, Map<String, String>>>(it, type)
            }.getOrNull()
        } ?: emptyMap()

        return InitialPlatformState(
            city = seed.city,
            foodVenues = seed.foodVenues,
            drinkVenues = seed.drinkVenues,
            weekendEvents = seed.weekendEvents,
            topReviewers = seed.topReviewers,
            foodHeroHeaders = seed.foodHeroHeaders,
            drinkHeroHeaders = seed.drinkHeroHeaders,
            publicVoteCategories = seed.publicVoteCategories,
            loyaltyPrograms = storedPrograms,
            savedSlugs = savedSlugs,
            darkMode = darkMode,
            currentUser = user,
            apiBaseUrl = clientHolder.baseUrl,
            localVoteCounts = voteCounts,
            localMyVotes = myVotes,
            localCheckinDays = prefs.getInt(KEY_LOCAL_CHECKIN_DAYS, 0),
        )
    }

    fun persistDarkMode(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_DARK_MODE, enabled).apply()
    }

    fun persistSavedSlugs(slugs: Set<String>) {
        prefs.edit().putStringSet(KEY_SAVED_SLUGS, slugs).apply()
    }

    fun persistLoyaltyPrograms(programs: List<LoyaltyProgram>) {
        prefs.edit().putString(KEY_LOYALTY_JSON, gson.toJson(programs)).apply()
    }

    fun persistLocalVotes(
        counts: Map<String, Map<String, Map<String, Int>>>,
        myVotes: Map<String, Map<String, String>>,
    ) {
        prefs.edit()
            .putString(KEY_LOCAL_VOTE_COUNTS, gson.toJson(counts))
            .putString(KEY_LOCAL_MY_VOTES, gson.toJson(myVotes))
            .apply()
    }

    fun persistUser(user: UserAccount?, token: String? = clientHolder.bearerToken) {
        clientHolder.bearerToken = token
        val editor = prefs.edit()
        if (user == null) {
            editor.remove(KEY_USER_JSON)
            editor.remove(KEY_BEARER_TOKEN)
        } else {
            editor.putString(KEY_USER_JSON, gson.toJson(user))
            if (token != null) editor.putString(KEY_BEARER_TOKEN, token)
        }
        editor.apply()
    }

    fun updateApiBaseUrl(url: String) {
        val clean = url.trim().trimEnd('/')
        if (clean.isNotBlank()) {
            clientHolder.baseUrl = clean
            prefs.edit().putString(KEY_API_BASE_URL, clean).apply()
        }
    }

    suspend fun checkHealth(): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            val res = clientHolder.api.health()
            res.isSuccessful && res.body()?.ok == true && res.body()?.data?.backendOnline == true
        }.getOrDefault(false)
    }

    data class LiveSyncBundle(
        val backendOnline: Boolean,
        val foodVenues: List<Restaurant>?,
        val drinkVenues: List<Restaurant>?,
        val adsFood: List<AdBanner>,
        val adsDrink: List<AdBanner>,
        val events: List<WeekendEvent>?,
        val reviewers: List<TopReviewer>?,
    )

    suspend fun syncLiveCatalog(): LiveSyncBundle = withContext(Dispatchers.IO) {
        runCatching {
            val health = clientHolder.api.health()
            val online = health.isSuccessful && health.body()?.data?.backendOnline == true
            if (!online) {
                return@runCatching LiveSyncBundle(false, null, null, emptyList(), emptyList(), null, null)
            }
            val foodRes = clientHolder.api.venues("food", 100).body()?.data
            val drinkRes = clientHolder.api.venues("drink", 100).body()?.data
            val weekendRes = clientHolder.api.weekend().body()?.data
            val reviewersRes = clientHolder.api.reviewers().body()?.data

            LiveSyncBundle(
                backendOnline = (foodRes?.backendOnline == true || drinkRes?.backendOnline == true),
                foodVenues = foodRes?.venues?.takeIf { it.isNotEmpty() },
                drinkVenues = drinkRes?.venues?.takeIf { it.isNotEmpty() },
                adsFood = foodRes?.ads ?: emptyList(),
                adsDrink = drinkRes?.ads ?: emptyList(),
                events = weekendRes?.events?.takeIf { it.isNotEmpty() },
                reviewers = reviewersRes?.reviewers?.takeIf { it.isNotEmpty() },
            )
        }.getOrElse {
            LiveSyncBundle(false, null, null, emptyList(), emptyList(), null, null)
        }
    }

    suspend fun fetchVenueDetail(slug: String, vertical: Vertical): Restaurant? = withContext(Dispatchers.IO) {
        runCatching {
            val res = clientHolder.api.venueDetail(slug, vertical.apiValue, 1)
            if (res.isSuccessful && res.body()?.ok == true) res.body()?.data?.venue else null
        }.getOrNull()
    }

    suspend fun loginDemo(email: String): RepoResult<UserAccount> = withContext(Dispatchers.IO) {
        val onlineResult = runCatching {
            val res = clientHolder.api.loginDemo(DemoLoginRequest(email, setCookie = false))
            val body = res.body()
            if (res.isSuccessful && body?.ok == true && body.data != null) {
                persistUser(body.data.user, body.data.token)
                return@withContext RepoResult.Success(body.data.user, "Autentificat pe server ca ${body.data.user.name}.")
            }
            null
        }.getOrNull()

        if (onlineResult != null) return@withContext onlineResult

        val fallbackUser = demoUsers.find { it.email == email } ?: demoUsers.first()
        persistUser(fallbackUser, null)
        RepoResult.Success(fallbackUser, "Mod offline activ · conectat ca ${fallbackUser.name}.")
    }

    suspend fun login(loginInput: String, password: String): RepoResult<UserAccount> = withContext(Dispatchers.IO) {
        val res = runCatching {
            clientHolder.api.login(LoginRequest(loginInput.trim(), password, setCookie = false))
        }.getOrNull()

        val body = res?.body()
        if (res != null && res.isSuccessful && body?.ok == true && body.data != null) {
            persistUser(body.data.user, body.data.token)
            return@withContext RepoResult.Success(body.data.user, "Bine ai revenit, ${body.data.user.name}!")
        }

        val errMsg = body?.error?.message
        if (errMsg != null) {
            return@withContext RepoResult.Error(errMsg)
        }

        // Offline local account creation/match
        val localDemo = demoUsers.find {
            it.email.equals(loginInput.trim(), ignoreCase = true) ||
                it.name.equals(loginInput.trim(), ignoreCase = true)
        }
        if (localDemo != null) {
            persistUser(localDemo, null)
            return@withContext RepoResult.Success(localDemo, "Conectat offline ca ${localDemo.name}.")
        }

        RepoResult.Error("Serverul nu răspunde. Folosește conturile demo rapide sau verifică conexiunea la API.")
    }

    suspend fun register(name: String, email: String, password: String, interests: List<String>): RepoResult<UserAccount> =
        withContext(Dispatchers.IO) {
            val res = runCatching {
                clientHolder.api.register(
                    RegisterRequest(
                        name = name.trim(),
                        email = email.trim(),
                        password = password,
                        interests = interests,
                        setCookie = false,
                    )
                )
            }.getOrNull()

            val body = res?.body()
            if (res != null && res.isSuccessful && body?.ok == true && body.data != null) {
                persistUser(body.data.user, body.data.token)
                return@withContext RepoResult.Success(body.data.user, "Cont creat cu succes!")
            }

            if (res != null && body?.error != null) {
                return@withContext RepoResult.Error(body.error.message)
            }

            if (name.trim().length < 2 || password.length < 8) {
                return@withContext RepoResult.Error("Completează numele și o parolă de minim 8 caractere.")
            }

            val isUni = email.lowercase().endsWith("@e-uvt.ro") || email.lowercase().endsWith("@upt.ro")
            val created = UserAccount(
                id = "local-${UUID.randomUUID().toString().take(8)}",
                username = DomainLogic.toCandidateSlug(name),
                name = name.trim(),
                email = email.trim(),
                role = if (isUni) "verified-local" else "tourist",
                neighborhood = if (isUni) "Complexul Studențesc" else null,
                weightMultiplier = if (isUni) 2.0 else 1.0,
                description = if (isUni) {
                    "Localnic verificat prin email universitar · pondere 2,0×."
                } else {
                    "Cont nou creat offline · pondere 1,0×."
                },
                interests = interests,
            )
            persistUser(created, null)
            RepoResult.Success(created, "Cont creat în modul offline.")
        }

    fun logout() {
        persistUser(null, null)
    }

    suspend fun submitReview(
        venue: Restaurant,
        user: UserAccount,
        foodScore: Int,
        trapEstimatePct: Int,
        text: String,
        praisedEmployee: String?,
        safetyScore: Int?,
        noiseLevel: String?,
        answers: Map<String, String>,
        gpsVerified: Boolean,
        backendOnline: Boolean,
    ): RepoResult<Review> = withContext(Dispatchers.IO) {
        if (backendOnline && !clientHolder.bearerToken.isNullOrBlank()) {
            val tokenRes = runCatching {
                clientHolder.api.reviewFormToken(venue.venueId ?: venue.slug).body()?.data
            }.getOrNull()

            if (gpsVerified) {
                runCatching {
                    clientHolder.api.checkinVenue(venue.slug, CheckinRequest(simulate = true))
                }
            }

            val req = WriteReviewRequest(
                rating = foodScore.coerceIn(1, 10),
                text = text.trim(),
                answers = answers.takeIf { it.isNotEmpty() },
                formToken = tokenRes?.token,
                website = "",
            )
            val apiRes = runCatching { clientHolder.api.writeReview(venue.slug, req) }.getOrNull()
            val body = apiRes?.body()
            if (apiRes != null && apiRes.isSuccessful && body?.ok == true) {
                val created = buildLocalReview(
                    id = body.data?.reviewId ?: "rev-${UUID.randomUUID().toString().take(6)}",
                    user = user,
                    foodScore = foodScore.toDouble(),
                    trapEstimatePct = trapEstimatePct,
                    text = text.trim(),
                    praisedEmployee = praisedEmployee,
                    safetyScore = safetyScore,
                    noiseLevel = noiseLevel,
                    answers = answers,
                    gpsVerified = body.data?.verifiedVisit == true || gpsVerified,
                )
                return@withContext RepoResult.Success(created, body.data?.message ?: "Review publicat pe server.")
            } else if (body?.error != null) {
                return@withContext RepoResult.Error(body.error.message)
            }
        }

        val localReview = buildLocalReview(
            id = "rev-${UUID.randomUUID().toString().take(8)}",
            user = user,
            foodScore = foodScore.toDouble(),
            trapEstimatePct = trapEstimatePct,
            text = text.trim(),
            praisedEmployee = praisedEmployee,
            safetyScore = safetyScore,
            noiseLevel = noiseLevel,
            answers = answers,
            gpsVerified = gpsVerified,
        )
        RepoResult.Success(localReview, "Review publicat! Scorul onest s-a recalculat.")
    }

    private fun buildLocalReview(
        id: String,
        user: UserAccount,
        foodScore: Double,
        trapEstimatePct: Int,
        text: String,
        praisedEmployee: String?,
        safetyScore: Int?,
        noiseLevel: String?,
        answers: Map<String, String>,
        gpsVerified: Boolean,
    ): Review {
        val baseWeight = when {
            user.isInfluencer == true -> 0.2
            user.role == "verified-local" -> 2.0
            else -> 1.0
        }
        val visitMultiplier = if (gpsVerified && user.isInfluencer != true) 1.3 else 1.0
        val finalWeight = (baseWeight * visitMultiplier * 100.0).toInt() / 100.0
        val role = when {
            user.isInfluencer == true -> "influencer"
            user.role == "verified-local" -> "verified-local"
            else -> "tourist"
        }
        return Review(
            id = id,
            authorId = user.id,
            authorUsername = user.username,
            authorName = user.name,
            authorRole = role,
            authorNeighborhood = user.neighborhood,
            weightMultiplier = finalWeight,
            isVerifiedVisit = gpsVerified,
            verifiedVia = if (gpsVerified) "gps" else null,
            foodScore = foodScore,
            trapEstimatePct = trapEstimatePct,
            markedAsTouristTrap = trapEstimatePct >= 65,
            date = "Astăzi",
            text = text,
            language = "RO",
            praisedEmployee = praisedEmployee?.takeIf { it.isNotBlank() },
            safetyScore = safetyScore,
            noiseLevel = noiseLevel,
            answers = answers.takeIf { it.isNotEmpty() },
        )
    }

    suspend fun toggleHelpful(reviewId: String, backendOnline: Boolean): Int? = withContext(Dispatchers.IO) {
        if (!backendOnline || clientHolder.bearerToken.isNullOrBlank()) return@withContext null
        runCatching {
            val res = clientHolder.api.voteHelpful(reviewId)
            if (res.isSuccessful && res.body()?.ok == true) res.body()?.data?.helpfulCount else null
        }.getOrNull()
    }

    suspend fun editReview(reviewId: String, rating: Int, text: String, backendOnline: Boolean): Boolean =
        withContext(Dispatchers.IO) {
            if (!backendOnline || clientHolder.bearerToken.isNullOrBlank()) return@withContext true
            runCatching {
                clientHolder.api.editReview(reviewId, EditReviewRequest(rating, text)).isSuccessful
            }.getOrDefault(false)
        }

    suspend fun deleteReview(reviewId: String, backendOnline: Boolean): Boolean =
        withContext(Dispatchers.IO) {
            if (!backendOnline || clientHolder.bearerToken.isNullOrBlank()) return@withContext true
            runCatching {
                clientHolder.api.deleteReview(reviewId).isSuccessful
            }.getOrDefault(false)
        }

    suspend fun reportCrowd(slug: String, level: Int, backendOnline: Boolean) = withContext(Dispatchers.IO) {
        if (!backendOnline) return@withContext
        runCatching { clientHolder.api.reportVibe(slug, VibeRequest(level)) }
    }

    suspend fun quickVote(slug: String, kind: String, value: Int, backendOnline: Boolean) =
        withContext(Dispatchers.IO) {
            if (!backendOnline || clientHolder.bearerToken.isNullOrBlank()) return@withContext
            runCatching { clientHolder.api.quickVote(slug, QuickVoteRequest(kind, value)) }
        }

    suspend fun submitVideo(slug: String, url: String, backendOnline: Boolean) =
        withContext(Dispatchers.IO) {
            if (!backendOnline) return@withContext
            runCatching { clientHolder.api.submitVideo(slug, VideoSubmitRequest(url)) }
        }

    suspend fun toggleSaveVenue(slug: String, shouldSave: Boolean, backendOnline: Boolean) =
        withContext(Dispatchers.IO) {
            if (!backendOnline || clientHolder.bearerToken.isNullOrBlank()) return@withContext
            runCatching {
                if (shouldSave) clientHolder.api.saveVenue(slug) else clientHolder.api.unsaveVenue(slug)
            }
        }

    suspend fun submitNewVenue(
        vertical: Vertical,
        name: String,
        address: String,
        neighborhood: String,
        backendOnline: Boolean,
    ): RepoResult<String> = withContext(Dispatchers.IO) {
        if (backendOnline && !clientHolder.bearerToken.isNullOrBlank()) {
            val res = runCatching {
                clientHolder.api.addVenue(AddVenueRequest(vertical.apiValue, name, address, neighborhood))
            }.getOrNull()
            val body = res?.body()
            if (res != null && res.isSuccessful && body?.ok == true) {
                return@withContext RepoResult.Success(body.data?.message ?: "Local trimis spre verificare!")
            }
            if (body?.error != null) return@withContext RepoResult.Error(body.error.message)
        }
        RepoResult.Success("Mulțumim! Propunerea pentru \"$name\" ($neighborhood) a fost înregistrată pentru moderare.")
    }

    data class LeaderboardSyncResult(
        val awards: MonthlyAwards,
        val entries: List<LeaderboardEntry>,
        val countsByCategory: Map<String, Map<String, Int>>,
        val myVotesByCategory: Map<String, String>,
    )

    suspend fun fetchLeaderboard(vertical: Vertical, month: String): LeaderboardSyncResult? =
        withContext(Dispatchers.IO) {
            runCatching {
                val res = clientHolder.api.leaderboard(vertical.apiValue, month)
                val data = res.body()?.data ?: return@runCatching null
                if (!data.backendOnline) return@runCatching null
                LeaderboardSyncResult(
                    awards = data.awards,
                    entries = data.entries,
                    countsByCategory = data.publicVote.countsByCategory,
                    myVotesByCategory = data.publicVote.myVotesByCategory,
                )
            }.getOrNull()
        }

    suspend fun castMonthlyVote(
        vertical: Vertical,
        month: String,
        activeMonth: String,
        categoryId: String,
        venueSlug: String,
        venueName: String,
        backendOnline: Boolean,
    ): RepoResult<Pair<Map<String, Map<String, Int>>, Map<String, String>>> = withContext(Dispatchers.IO) {
        if (backendOnline && !clientHolder.bearerToken.isNullOrBlank()) {
            val res = runCatching {
                clientHolder.api.castMonthlyVote(
                    MonthlyVoteRequest(vertical.apiValue, month, activeMonth, categoryId, venueSlug, venueName)
                )
            }.getOrNull()
            val body = res?.body()
            if (res != null && res.isSuccessful && body?.ok == true && body.data != null) {
                return@withContext RepoResult.Success(
                    body.data.countsByCategory to body.data.myVotesByCategory,
                    "Vot înregistrat pentru $venueName!"
                )
            }
            if (body?.error != null) return@withContext RepoResult.Error(body.error.message)
        }
        RepoResult.Error("OFFLINE_FALLBACK")
    }

    suspend fun fetchLoyaltyPrograms(): List<LoyaltyProgram>? = withContext(Dispatchers.IO) {
        runCatching {
            val res = clientHolder.api.loyaltyPrograms()
            val data = res.body()?.data ?: return@runCatching null
            if (!data.backendOnline) return@runCatching null
            data.programs
        }.getOrNull()
    }

    suspend fun scanLoyaltyCode(programId: String?, code: String?, backendOnline: Boolean): RepoResult<String> =
        withContext(Dispatchers.IO) {
            if (backendOnline && !clientHolder.bearerToken.isNullOrBlank()) {
                val res = runCatching {
                    clientHolder.api.loyaltyScan(LoyaltyScanRequest(programId, code))
                }.getOrNull()
                val body = res?.body()
                if (res != null && res.isSuccessful && body?.ok == true) {
                    return@withContext RepoResult.Success(body.data?.message ?: "Ștampilă adăugată!")
                }
                if (body?.error != null) return@withContext RepoResult.Error(body.error.message)
            }
            RepoResult.Error("OFFLINE_FALLBACK")
        }

    suspend fun createPersonalCard(
        venueName: String,
        rewardTitle: String,
        stampsRequired: Int,
        iconId: String,
        backendOnline: Boolean,
    ): Boolean = withContext(Dispatchers.IO) {
        if (!backendOnline || clientHolder.bearerToken.isNullOrBlank()) return@withContext false
        runCatching {
            clientHolder.api.createPersonalCard(
                CreatePersonalCardRequest(venueName, rewardTitle, stampsRequired, iconId)
            ).isSuccessful
        }.getOrDefault(false)
    }

    suspend fun createOutingPoll(venueSlugs: List<String>, backendOnline: Boolean): OutingPoll =
        withContext(Dispatchers.IO) {
            if (backendOnline) {
                val res = runCatching { clientHolder.api.createPoll(CreatePollRequest(venueSlugs)) }.getOrNull()
                val data = res?.body()?.data
                if (res != null && res.isSuccessful && data != null) {
                    return@withContext OutingPoll(
                        token = data.token,
                        venueIds = data.venueIds,
                        counts = data.venueIds.associateWith { 0 },
                        myVote = null,
                        totalVotes = 0,
                        shareUrl = data.shareUrl,
                    )
                }
            }
            val token = "tm-${UUID.randomUUID().toString().take(6)}"
            OutingPoll(
                token = token,
                venueIds = venueSlugs,
                counts = venueSlugs.associateWith { 0 },
                myVote = null,
                totalVotes = 0,
                shareUrl = "https://topfood.ro/unde-iesim/$token",
            )
        }

    suspend fun voteOutingPoll(
        poll: OutingPoll,
        venueSlug: String,
        backendOnline: Boolean,
    ): OutingPoll = withContext(Dispatchers.IO) {
        if (backendOnline && !poll.token.startsWith("tm-")) {
            val res = runCatching {
                clientHolder.api.votePoll(poll.token, PollVoteRequest(venueSlug))
            }.getOrNull()
            val headerToken = res?.headers()?.get("X-Voter-Token")
            val bodyData = res?.body()?.data
            if (res != null && res.isSuccessful && bodyData != null) {
                val voter = bodyData.voterToken ?: headerToken
                if (!voter.isNullOrBlank()) {
                    clientHolder.voterToken = voter
                    prefs.edit().putString(KEY_VOTER_TOKEN, voter).apply()
                }
                return@withContext OutingPoll(
                    token = bodyData.token.ifBlank { poll.token },
                    venueIds = bodyData.venueIds.ifEmpty { poll.venueIds },
                    counts = bodyData.counts,
                    myVote = bodyData.myVote ?: venueSlug,
                    totalVotes = bodyData.totalVotes,
                    shareUrl = poll.shareUrl,
                    voterToken = voter,
                )
            }
        }

        val updatedCounts = poll.counts.toMutableMap()
        poll.myVote?.let { prev ->
            updatedCounts[prev] = maxOf(0, (updatedCounts[prev] ?: 1) - 1)
        }
        updatedCounts[venueSlug] = (updatedCounts[venueSlug] ?: 0) + 1
        poll.copy(
            counts = updatedCounts,
            myVote = venueSlug,
            totalVotes = updatedCounts.values.sum(),
        )
    }

    suspend fun checkInCityLocal(user: UserAccount, backendOnline: Boolean): Pair<Int, UserAccount> =
        withContext(Dispatchers.IO) {
            if (backendOnline && !clientHolder.bearerToken.isNullOrBlank()) {
                val res = runCatching {
                    clientHolder.api.localVerificationCheckin(
                        LocalCheckinRequest(45.7558, 21.2286)
                    )
                }.getOrNull()
                val data = res?.body()?.data
                if (res != null && res.isSuccessful && data != null) {
                    val upgradedUser = if (data.becameLocal) {
                        user.copy(
                            role = "verified-local",
                            weightMultiplier = 2.0,
                            neighborhood = user.neighborhood ?: "Cetate",
                            description = "Localnic verificat Timișoara · review-urile tale au pondere 2,0×.",
                        )
                    } else {
                        user
                    }
                    if (data.becameLocal) persistUser(upgradedUser)
                    prefs.edit().putInt(KEY_LOCAL_CHECKIN_DAYS, data.days).apply()
                    return@withContext data.days to upgradedUser
                }
            }

            val nextDays = minOf(3, prefs.getInt(KEY_LOCAL_CHECKIN_DAYS, 0) + 1)
            prefs.edit().putInt(KEY_LOCAL_CHECKIN_DAYS, nextDays).apply()
            val upgradedUser = if (nextDays >= 3) {
                user.copy(
                    role = "verified-local",
                    weightMultiplier = 2.0,
                    neighborhood = user.neighborhood ?: "Cetate",
                    description = "Localnic verificat Timișoara · review-urile tale au pondere 2,0×.",
                ).also { persistUser(it) }
            } else {
                user
            }
            nextDays to upgradedUser
        }

    suspend fun startUniEmailVerification(email: String, backendOnline: Boolean): RepoResult<String> =
        withContext(Dispatchers.IO) {
            val trimmed = email.trim().lowercase()
            if (!trimmed.endsWith("@e-uvt.ro") && !trimmed.endsWith("@upt.ro")) {
                return@withContext RepoResult.Error("Folosește o adresă universitară validă (@e-uvt.ro sau @upt.ro).")
            }
            if (backendOnline && !clientHolder.bearerToken.isNullOrBlank()) {
                val res = runCatching {
                    clientHolder.api.localEmailStart(EmailStartRequest(trimmed))
                }.getOrNull()
                val body = res?.body()
                if (res != null && res.isSuccessful && body?.ok == true) {
                    val codeHint = body.data?.demoCode?.let { " Cod demo: $it" } ?: ""
                    return@withContext RepoResult.Success((body.data?.message ?: "Cod trimis.") + codeHint)
                }
            }
            RepoResult.Success("Cod demo trimis către $trimmed: 123456")
        }

    suspend fun confirmUniEmailVerification(
        code: String,
        user: UserAccount,
        backendOnline: Boolean,
    ): RepoResult<UserAccount> = withContext(Dispatchers.IO) {
        if (backendOnline && !clientHolder.bearerToken.isNullOrBlank()) {
            val res = runCatching {
                clientHolder.api.localEmailConfirm(EmailConfirmRequest(code.trim()))
            }.getOrNull()
            val body = res?.body()
            if (res != null && res.isSuccessful && body?.ok == true && body.data?.verified == true) {
                val upgraded = user.copy(
                    role = "verified-local",
                    weightMultiplier = 2.0,
                    neighborhood = user.neighborhood ?: "Complexul Studențesc",
                    description = "Localnic verificat (@e-uvt.ro / @upt.ro) · review-urile tale au pondere 2,0×.",
                )
                persistUser(upgraded)
                return@withContext RepoResult.Success(upgraded, body.data.message)
            }
            if (body?.error != null) return@withContext RepoResult.Error(body.error.message)
        }

        if (code.trim() == "123456" || code.trim().length == 6) {
            val upgraded = user.copy(
                role = "verified-local",
                weightMultiplier = 2.0,
                neighborhood = user.neighborhood ?: "Complexul Studențesc",
                description = "Localnic verificat prin email universitar · pondere 2,0×.",
            )
            persistUser(upgraded)
            return@withContext RepoResult.Success(upgraded, "Gata! Ești Localnic verificat (pondere 2,0×).")
        }
        RepoResult.Error("Cod invalid. Folosește codul de 6 cifre (demo: 123456).")
    }

    companion object {
        private const val KEY_API_BASE_URL = "api_base_url"
        private const val KEY_BEARER_TOKEN = "bearer_token"
        private const val KEY_VOTER_TOKEN = "voter_token"
        private const val KEY_SAVED_SLUGS = "saved_slugs"
        private const val KEY_DARK_MODE = "dark_mode"
        private const val KEY_USER_JSON = "user_json"
        private const val KEY_LOYALTY_JSON = "loyalty_json"
        private const val KEY_LOCAL_VOTE_COUNTS = "local_vote_counts"
        private const val KEY_LOCAL_MY_VOTES = "local_my_votes"
        private const val KEY_LOCAL_CHECKIN_DAYS = "local_checkin_days"
    }
}
