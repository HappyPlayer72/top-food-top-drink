package ro.topfood.app.data.network

import com.google.gson.GsonBuilder
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import ro.topfood.app.BuildConfig
import ro.topfood.app.data.model.AdBanner
import ro.topfood.app.data.model.ApiEnvelope
import ro.topfood.app.data.model.Coordinates
import ro.topfood.app.data.model.LeaderboardEntry
import ro.topfood.app.data.model.LoyaltyProgram
import ro.topfood.app.data.model.MonthlyAwards
import ro.topfood.app.data.model.PublicVoteCategoryTop
import ro.topfood.app.data.model.Restaurant
import ro.topfood.app.data.model.TopReviewer
import ro.topfood.app.data.model.TrapSummary
import ro.topfood.app.data.model.UserAccount
import ro.topfood.app.data.model.WeekendEvent
import java.util.concurrent.TimeUnit

data class HealthPayload(
    val status: String = "ok",
    val backendOnline: Boolean = false,
)

data class AuthSessionPayload(
    val token: String = "",
    val expiresAt: String? = null,
    val tokenType: String = "Bearer",
    val user: UserAccount = UserAccount(),
)

data class AuthMePayload(
    val user: UserAccount = UserAccount(),
    val myQuickVotes: Map<String, Map<String, Int>> = emptyMap(),
)

data class DemoLoginRequest(val email: String, val setCookie: Boolean = false)
data class LoginRequest(val login: String, val password: String, val setCookie: Boolean = false)
data class RegisterRequest(
    val name: String,
    val username: String? = null,
    val email: String,
    val password: String,
    val interests: List<String> = emptyList(),
    val setCookie: Boolean = false,
)

data class VenuesPayload(
    val vertical: String = "food",
    val citySlug: String = "timisoara",
    val venues: List<Restaurant> = emptyList(),
    val sponsored: List<Restaurant> = emptyList(),
    val traps: List<TrapSummary> = emptyList(),
    val ads: List<AdBanner> = emptyList(),
    val reviewCount: Int = 0,
    val backendOnline: Boolean = false,
)

data class VenueDetailPayload(
    val venue: Restaurant? = null,
    val myQuickVotes: Map<String, Int> = emptyMap(),
    val backendOnline: Boolean = false,
)

data class FormTokenPayload(
    val venueId: String = "",
    val token: String = "",
    val minFillMs: Long = 3000,
    val tokenTtlMs: Long = 3600000,
)

data class WriteReviewRequest(
    val rating: Int,
    val text: String,
    val answers: Map<String, String>? = null,
    val formToken: String? = null,
    val website: String = "",
)

data class WriteReviewPayload(
    val reviewId: String? = null,
    val verifiedVisit: Boolean = false,
    val held: Boolean = false,
    val message: String = "",
)

data class EditReviewRequest(val rating: Int, val text: String)

data class HelpfulPayload(val voted: Boolean = false, val helpfulCount: Int = 0)

data class CheckinRequest(val lat: Double? = null, val lng: Double? = null, val simulate: Boolean = true)
data class CheckinPayload(
    val simulated: Boolean = false,
    val distanceM: Int? = null,
    val day: String? = null,
    val upgraded: Boolean = false,
    val message: String = "",
)

data class VibeRequest(val level: Int)
data class VibePayload(val id: String = "", val level: Int = 3, val expiresAt: String? = null)

data class QuickVoteRequest(val kind: String, val value: Int)
data class QuickVotePayload(val kind: String = "", val value: Int = 0)

data class VideoSubmitRequest(val url: String)

data class SaveVenuePayload(val savedVenueSlugs: List<String> = emptyList())

data class AddVenueRequest(
    val vertical: String,
    val name: String,
    val address: String,
    val neighborhood: String,
)

data class AddVenuePayload(val outcome: String = "", val message: String = "")

data class PublicVoteSectionPayload(
    val activeMonth: String = "2026-11",
    val selectedMonth: String = "2026-11",
    val months: List<String> = emptyList(),
    val categoryTops: List<PublicVoteCategoryTop> = emptyList(),
    val countsByCategory: Map<String, Map<String, Int>> = emptyMap(),
    val myVotesByCategory: Map<String, String> = emptyMap(),
)

data class LeaderboardPayload(
    val vertical: String = "food",
    val month: String? = null,
    val months: List<String> = emptyList(),
    val awards: MonthlyAwards = MonthlyAwards(),
    val entries: List<LeaderboardEntry> = emptyList(),
    val publicVote: PublicVoteSectionPayload = PublicVoteSectionPayload(),
    val backendOnline: Boolean = false,
)

data class MonthlyVoteRequest(
    val vertical: String,
    val month: String,
    val activeMonth: String,
    val categoryId: String,
    val venueSlug: String,
    val venueName: String,
)

data class MonthlyVotePayload(
    val countsByCategory: Map<String, Map<String, Int>> = emptyMap(),
    val myVotesByCategory: Map<String, String> = emptyMap(),
)

data class WeekendPayload(val events: List<WeekendEvent> = emptyList(), val backendOnline: Boolean = false)
data class ReviewersPayload(val reviewers: List<TopReviewer> = emptyList(), val backendOnline: Boolean = false)

data class LoyaltyProgramsPayload(
    val programs: List<LoyaltyProgram> = emptyList(),
    val loggedIn: Boolean = false,
    val backendOnline: Boolean = false,
)

data class LoyaltyScanRequest(val programId: String? = null, val code: String? = null)
data class LoyaltyScanPayload(
    val action: String = "stamped",
    val message: String = "",
)

data class CreatePersonalCardRequest(
    val venueName: String,
    val rewardTitle: String,
    val stampsRequired: Int,
    val iconId: String,
)

data class CreatePollRequest(val venueIds: List<String>)
data class CreatePollPayload(
    val token: String = "",
    val venueIds: List<String> = emptyList(),
    val shareUrl: String = "",
)

data class PollStatePayload(
    val token: String = "",
    val venueIds: List<String> = emptyList(),
    val counts: Map<String, Int> = emptyMap(),
    val myVote: String? = null,
    val totalVotes: Int = 0,
    val voterToken: String? = null,
)

data class PollVoteRequest(val venueSlug: String)

data class LocalVerificationPayload(
    val isLocal: Boolean = false,
    val days: Int = 0,
    val needed: Int = 3,
)

data class LocalCheckinRequest(val lat: Double, val lng: Double)
data class LocalCheckinPayload(
    val becameLocal: Boolean = false,
    val days: Int = 0,
    val needed: Int = 3,
    val message: String = "",
)

data class EmailStartRequest(val email: String)
data class EmailStartPayload(val message: String = "", val demoCode: String? = null)
data class EmailConfirmRequest(val code: String)
data class EmailConfirmPayload(val verified: Boolean = false, val message: String = "")

data class TasteTourRequest(
    val query: String = "",
    val categories: List<String>? = null,
    val budgetRon: Double = 100.0,
    val stopCount: Int = 2,
    val origin: Coordinates = Coordinates(45.7558, 21.2286),
    val vertical: String = "all",
)

interface TopFoodApi {
    @GET("/api/v1/health")
    suspend fun health(): Response<ApiEnvelope<HealthPayload>>

    @POST("/api/v1/auth/demo")
    suspend fun loginDemo(@Body body: DemoLoginRequest): Response<ApiEnvelope<AuthSessionPayload>>

    @POST("/api/v1/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<ApiEnvelope<AuthSessionPayload>>

    @POST("/api/v1/auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<ApiEnvelope<AuthSessionPayload>>

    @GET("/api/v1/auth/me")
    suspend fun me(): Response<ApiEnvelope<AuthMePayload>>

    @GET("/api/v1/venues")
    suspend fun venues(
        @Query("vertical") vertical: String,
        @Query("limit") limit: Int = 100,
    ): Response<ApiEnvelope<VenuesPayload>>

    @POST("/api/v1/venues")
    suspend fun addVenue(@Body body: AddVenueRequest): Response<ApiEnvelope<AddVenuePayload>>

    @GET("/api/v1/venues/{slug}")
    suspend fun venueDetail(
        @Path("slug") slug: String,
        @Query("vertical") vertical: String,
        @Query("trackView") trackView: Int = 1,
    ): Response<ApiEnvelope<VenueDetailPayload>>

    @GET("/api/v1/reviews/form-token")
    suspend fun reviewFormToken(@Query("venueId") venueId: String): Response<ApiEnvelope<FormTokenPayload>>

    @POST("/api/v1/venues/{slug}/reviews")
    suspend fun writeReview(
        @Path("slug") slug: String,
        @Body body: WriteReviewRequest,
    ): Response<ApiEnvelope<WriteReviewPayload>>

    @PATCH("/api/v1/reviews/{reviewId}")
    suspend fun editReview(
        @Path("reviewId") reviewId: String,
        @Body body: EditReviewRequest,
    ): Response<ApiEnvelope<Map<String, Any>>>

    @DELETE("/api/v1/reviews/{reviewId}")
    suspend fun deleteReview(@Path("reviewId") reviewId: String): Response<ApiEnvelope<Map<String, Any>>>

    @POST("/api/v1/reviews/{reviewId}/helpful")
    suspend fun voteHelpful(@Path("reviewId") reviewId: String): Response<ApiEnvelope<HelpfulPayload>>

    @POST("/api/v1/venues/{slug}/checkin")
    suspend fun checkinVenue(
        @Path("slug") slug: String,
        @Body body: CheckinRequest,
    ): Response<ApiEnvelope<CheckinPayload>>

    @POST("/api/v1/venues/{slug}/vibe")
    suspend fun reportVibe(
        @Path("slug") slug: String,
        @Body body: VibeRequest,
    ): Response<ApiEnvelope<VibePayload>>

    @POST("/api/v1/venues/{slug}/quick-vote")
    suspend fun quickVote(
        @Path("slug") slug: String,
        @Body body: QuickVoteRequest,
    ): Response<ApiEnvelope<QuickVotePayload>>

    @POST("/api/v1/venues/{slug}/videos")
    suspend fun submitVideo(
        @Path("slug") slug: String,
        @Body body: VideoSubmitRequest,
    ): Response<ApiEnvelope<Map<String, Any>>>

    @PUT("/api/v1/me/saved/{slug}")
    suspend fun saveVenue(@Path("slug") slug: String): Response<ApiEnvelope<SaveVenuePayload>>

    @DELETE("/api/v1/me/saved/{slug}")
    suspend fun unsaveVenue(@Path("slug") slug: String): Response<ApiEnvelope<SaveVenuePayload>>

    @GET("/api/v1/me/local-verification")
    suspend fun localVerificationStatus(): Response<ApiEnvelope<LocalVerificationPayload>>

    @POST("/api/v1/me/local-verification/checkin")
    suspend fun localVerificationCheckin(@Body body: LocalCheckinRequest): Response<ApiEnvelope<LocalCheckinPayload>>

    @POST("/api/v1/me/local-verification/email/start")
    suspend fun localEmailStart(@Body body: EmailStartRequest): Response<ApiEnvelope<EmailStartPayload>>

    @POST("/api/v1/me/local-verification/email/confirm")
    suspend fun localEmailConfirm(@Body body: EmailConfirmRequest): Response<ApiEnvelope<EmailConfirmPayload>>

    @GET("/api/v1/leaderboard")
    suspend fun leaderboard(
        @Query("vertical") vertical: String,
        @Query("month") month: String? = null,
    ): Response<ApiEnvelope<LeaderboardPayload>>

    @POST("/api/v1/monthly-votes")
    suspend fun castMonthlyVote(@Body body: MonthlyVoteRequest): Response<ApiEnvelope<MonthlyVotePayload>>

    @GET("/api/v1/weekend")
    suspend fun weekend(): Response<ApiEnvelope<WeekendPayload>>

    @GET("/api/v1/reviewers")
    suspend fun reviewers(): Response<ApiEnvelope<ReviewersPayload>>

    @GET("/api/v1/loyalty/programs")
    suspend fun loyaltyPrograms(): Response<ApiEnvelope<LoyaltyProgramsPayload>>

    @POST("/api/v1/loyalty/scan")
    suspend fun loyaltyScan(@Body body: LoyaltyScanRequest): Response<ApiEnvelope<LoyaltyScanPayload>>

    @POST("/api/v1/loyalty/cards")
    suspend fun createPersonalCard(@Body body: CreatePersonalCardRequest): Response<ApiEnvelope<Map<String, Any>>>

    @POST("/api/v1/polls")
    suspend fun createPoll(@Body body: CreatePollRequest): Response<ApiEnvelope<CreatePollPayload>>

    @GET("/api/v1/polls/{token}")
    suspend fun getPoll(@Path("token") token: String): Response<ApiEnvelope<PollStatePayload>>

    @POST("/api/v1/polls/{token}/vote")
    suspend fun votePoll(
        @Path("token") token: String,
        @Body body: PollVoteRequest,
    ): Response<ApiEnvelope<PollStatePayload>>
}

class ApiClientHolder(
    initialBaseUrl: String = BuildConfig.DEFAULT_API_BASE_URL,
) {
    @Volatile
    var baseUrl: String = initialBaseUrl.trim().trimEnd('/')

    @Volatile
    var bearerToken: String? = null

    @Volatile
    var voterToken: String? = null

    private val authAndHostInterceptor = Interceptor { chain ->
        val original = chain.request()
        val parsedBase = baseUrl.toHttpUrlOrNull()
        val builder = original.newBuilder()

        if (parsedBase != null) {
            val rewrittenUrl = original.url.newBuilder()
                .scheme(parsedBase.scheme)
                .host(parsedBase.host)
                .port(parsedBase.port)
                .build()
            builder.url(rewrittenUrl)
        }

        bearerToken?.takeIf { it.isNotBlank() }?.let {
            builder.header("Authorization", "Bearer $it")
        }
        voterToken?.takeIf { it.isNotBlank() }?.let {
            builder.header("X-Voter-Token", it)
        }
        builder.header("Accept", "application/json")

        chain.proceed(builder.build())
    }

    private val logging = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BASIC
    }

    private val okHttp = OkHttpClient.Builder()
        .connectTimeout(4, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(8, TimeUnit.SECONDS)
        .addInterceptor(authAndHostInterceptor)
        .addInterceptor(logging)
        .build()

    private val gson = GsonBuilder().setLenient().create()

    val api: TopFoodApi = Retrofit.Builder()
        .baseUrl("http://10.0.2.2:3000/")
        .client(okHttp)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()
        .create(TopFoodApi::class.java)
}
