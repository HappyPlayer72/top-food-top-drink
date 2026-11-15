package ro.topfood.app.data.model

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

enum class Vertical(val apiValue: String, val label: String, val tagline: String) {
    FOOD("food", "TopFood", "Mâncare cinstită în Timișoara"),
    DRINK("drink", "TopDrink", "Baruri, bere rece & atmosferă"),
}

enum class NavSection(val label: String) {
    TOP("Top"),
    MAP("Hartă"),
    MONTHLY("Luna asta"),
    SCARNAVII("Scârnăvii"),
    FIDELITATE("Fidelitate"),
}

enum class TrapTier(val wireValue: String, val label: String) {
    LOCAL_STAPLE("local-staple", "Favorit local"),
    MIXED_FAIR("mixed-fair", "Posibilă capcană"),
    TOURIST_TRAP("tourist-trap", "Capcană turistică"),
}

enum class SortOrder(val apiValue: String, val label: String) {
    HONEST("honest", "Scor Onest"),
    TRAP_ASC("trap_asc", "Fără capcane"),
    PRICE_ASC("price_asc", "Preț crescător"),
    REVIEWS("reviews", "Cele mai evaluate"),
}

data class Coordinates(
    val lat: Double = 45.7558,
    val lng: Double = 21.2286,
)

data class SignatureDish(
    val name: String = "",
    val priceRon: Double = 0.0,
    val description: String? = null,
    val isMustOrder: Boolean = false,
)

data class MenuItem(
    val name: String = "",
    val priceRon: Double = 0.0,
    val description: String? = null,
    val portion: String? = null,
    val isMustOrder: Boolean = false,
    val photoUrl: String? = null,
)

data class MenuCategory(
    val title: String = "",
    val items: List<MenuItem> = emptyList(),
)

data class WeeklyHoursEntry(
    val day: String = "",
    val hours: String = "",
)

data class TrapBreakdown(
    val touristVsLocalGap: Double = 0.0,
    val touristZoneProximityM: Int = 0,
    val priceVsCategoryPct: Int = 0,
    val foreignLangReviewsPct: Int = 0,
    val singleVisitPct: Int = 0,
)

data class AspectScores(
    val food: Double = 0.0,
    val service: Double = 0.0,
    val value: Double = 0.0,
    val atmosphere: Double = 0.0,
)

data class ReviewCounts(
    val locals: Int = 0,
    val tourists: Int = 0,
    val influencers: Int = 0,
) {
    val total: Int get() = locals + tourists + influencers
}

data class Review(
    val id: String? = null,
    val authorName: String = "",
    val authorRole: String = "regular",
    val authorNeighborhood: String? = null,
    val followerCountText: String? = null,
    val helpfulCount: Int = 0,
    val weightMultiplier: Double = 1.0,
    val isVerifiedVisit: Boolean = false,
    val verifiedVia: String? = null,
    val isPaidCollab: Boolean? = null,
    val foodScore: Double = 8.0,
    val trapEstimatePct: Int = 15,
    val markedAsTouristTrap: Boolean? = null,
    val date: String = "",
    val text: String = "",
    val language: String = "RO",
    val ownerReply: String? = null,
    val ownerReplyAuthor: String? = null,
    val praisedEmployee: String? = null,
    val safetyScore: Int? = null,
    val noiseLevel: String? = null,
    val answers: Map<String, String>? = null,
    val authorId: String? = null,
    val authorUsername: String? = null,
)

data class OwnerPost(
    val id: String = "",
    val type: String = "news",
    val title: String = "",
    val content: String = "",
    val date: String = "",
)

data class KitchenStory(
    val author: String = "",
    val date: String = "",
    val title: String = "",
    val body: String = "",
    val photoUrl: String? = null,
)

data class TeamMember(
    val name: String = "",
    val role: String = "",
    val positiveMentions: Int = 0,
    val isEmployeeOfMonth: Boolean? = null,
    val monthLabel: String? = null,
)

data class VenueVideoPrice(
    val item: String = "",
    val priceLei: Double = 0.0,
)

data class VenueVideo(
    val url: String = "",
    val platform: String = "",
    val dishes: List<String> = emptyList(),
    val prices: List<VenueVideoPrice> = emptyList(),
    val isPaid: Boolean = false,
    val adSignal: String = "organic",
    val sentiment: String = "neutral",
)

data class VenueWarnings(
    val unsafeFeeling: String? = null,
    val veryNoisy: String? = null,
    val brightLights: String? = null,
)

data class VenueFacilities(
    val disabilityFriendly: JsonElement? = null,
    val hasOutlets: Boolean? = null,
    val otherFacilities: List<String> = emptyList(),
) {
    fun disabilityLabel(): String? {
        val el = disabilityFriendly ?: return null
        if (el.isJsonNull) return null
        if (el.isJsonPrimitive) {
            val prim = el.asJsonPrimitive
            if (prim.isBoolean) {
                return if (prim.asBoolean) "Acces fără trepte / prietenos cu scaunul rulant" else null
            }
            if (prim.isString) return prim.asString
        }
        return null
    }
}

data class VenueDeliveryInfo(
    val available: Boolean = false,
    val platforms: List<String> = emptyList(),
    val ownDelivery: Boolean? = null,
    val minimumOrderRon: Double? = null,
    val estimatedTime: String? = null,
    val note: String? = null,
)

data class FeatureItem(
    val key: String = "",
    val label: String = "",
    val state: String = "unknown",
    val percent: Int? = null,
    val owner: String? = null,
    val text: String = "",
    val ownerText: String? = null,
)

data class VenueFeatureGroup(
    val theme: String = "",
    val label: String = "",
    val items: List<FeatureItem> = emptyList(),
)

data class QuickStats(
    val safetyAvg: Double? = null,
    val safetyCount: Int? = null,
    val noiseMode: String? = null,
    val noiseCount: Int? = null,
)

data class Restaurant(
    val id: String = "",
    val venueId: String? = null,
    val slug: String = "",
    val name: String = "",
    val vertical: String? = "food",
    val neighborhood: String = "",
    val shortNeighborhood: String? = null,
    val cuisine: String = "",
    val shortCategory: String? = null,
    val categories: List<String> = emptyList(),
    val priceTier: String = "$$",
    val avgMealPriceRon: Double = 0.0,
    val categoryAvgPriceRon: Double = 0.0,
    val priceRangeLabel: String? = null,
    val openUntilLabel: String? = null,
    val photoUrl: String = "",
    val editorialHeadline: String = "",
    val editorialWriteup: List<String> = emptyList(),
    val whatToOrder: List<SignatureDish> = emptyList(),
    val occasionTags: List<String> = emptyList(),
    val foodQualityScore: Double = 0.0,
    val localsScore: Double = 0.0,
    val touristsScore: Double = 0.0,
    val googleRawRating: Double = 0.0,
    val touristTrapIndex: Int = 0,
    val trapTier: String = "local-staple",
    val trapReasons: List<String> = emptyList(),
    val verifiedVisitCount: Int? = null,
    val trapBreakdown: TrapBreakdown? = null,
    val aspectScores: AspectScores? = null,
    val isSponsored: Boolean = false,
    val sponsoredNote: String? = null,
    val isPartner: Boolean = false,
    val coordinates: Coordinates = Coordinates(),
    val address: String = "",
    val hours: String = "",
    val weeklyHours: List<WeeklyHoursEntry> = emptyList(),
    val openNow: Boolean = true,
    val phone: String = "",
    val lastUpdated: String? = null,
    val menuCategories: List<MenuCategory> = emptyList(),
    val features: List<VenueFeatureGroup> = emptyList(),
    val quick: QuickStats? = null,
    val monthlyRank: Int? = null,
    val monthlyScore: Double? = null,
    val monthlyStatusLabel: String? = null,
    val monthlyRankChange: Int? = null,
    val isRisingStar: Boolean? = null,
    val crowdSegments: Int? = null,
    val crowdLabel: String? = null,
    val drinkTags: List<String> = emptyList(),
    val warnings: VenueWarnings? = null,
    val facilities: VenueFacilities? = null,
    val delivery: VenueDeliveryInfo? = null,
    val reviewCounts: ReviewCounts? = null,
    val reviews: List<Review> = emptyList(),
    val kitchenStory: KitchenStory? = null,
    val ownerPosts: List<OwnerPost> = emptyList(),
    val team: List<TeamMember> = emptyList(),
    val videos: List<VenueVideo> = emptyList(),
)

data class TouristZone(
    val id: String = "",
    val name: String = "",
    val shortName: String = "",
    val description: String = "",
    val center: Coordinates = Coordinates(),
    val radiusM: Int = 300,
)

data class NeighborhoodZone(
    val id: String = "",
    val name: String = "",
    val cameraKey: String = "",
    val center: List<Double> = emptyList(), // [lng, lat]
    val zoom: Double = 14.8,
    val coordinates: List<List<List<Double>>> = emptyList(),
)

data class Landmark(
    val name: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
)

data class CityMetadata(
    val slug: String = "timisoara",
    val name: String = "Timișoara",
    val center: Coordinates = Coordinates(),
    val neighborhoods: List<String> = emptyList(),
    val neighborhoodZones: List<NeighborhoodZone> = emptyList(),
    val touristZones: List<TouristZone> = emptyList(),
    val landmarks: List<Landmark> = emptyList(),
)

data class WeekendEvent(
    val id: String = "",
    val dayShort: String = "",
    val dayNumber: String = "",
    val title: String = "",
    val venueName: String = "",
    val venueId: String = "",
    val details: String = "",
    val neighborhood: String? = null,
    val address: String? = null,
)

data class TopReviewer(
    val id: String = "",
    val username: String? = null,
    val initials: String = "",
    val name: String = "",
    val role: String = "verified-local",
    val badgeLabel: String = "",
    val helpfulVotes: Int = 0,
)

data class FoodHeroHeader(
    val main: String = "",
    val tail: String = "",
)

data class PublicVoteCategoryEntry(
    val rank: Int = 1,
    val venueName: String = "",
    val venueSlug: String? = null,
    val neighborhood: String = "",
    val dishHighlight: String = "",
    val votes: Int = 0,
    val voteSharePct: Int = 0,
    val trendLabel: String = "=",
)

data class PublicVoteCategoryTop(
    val id: String = "",
    val title: String = "",
    val shortLabel: String = "",
    val totalVotes: Int = 0,
    val top3: List<PublicVoteCategoryEntry> = emptyList(),
)

data class PublicVoteNominee(
    val candidateSlug: String,
    val venueName: String,
    val venueSlug: String?,
    val neighborhood: String,
    val dishHighlight: String,
    val votes: Int,
    val voteSharePct: Int,
    val rank: Int,
    val trendLabel: String,
)

data class ComputedCategoryVoteTop(
    val id: String,
    val title: String,
    val shortLabel: String,
    val totalVotes: Int,
    val top3: List<PublicVoteCategoryEntry>,
    val allNominees: List<PublicVoteNominee>,
)

data class RevelationAward(
    val venueId: String = "",
    val name: String? = null,
    val slug: String? = null,
    val neighborhood: String? = null,
    val from: Double = 0.0,
    val to: Double = 0.0,
)

data class EmployeeAward(
    val employeeId: String = "",
    val venueId: String = "",
    val mentions: Int = 0,
    val firstName: String = "",
    val venue: String = "",
    val venueSlug: String? = null,
)

data class LocalAward(
    val userId: String = "",
    val reviews: Int = 0,
    val username: String? = null,
    val displayName: String = "",
    val neighborhood: String? = null,
)

data class InfluencerAward(
    val userId: String = "",
    val reviews: Int = 0,
    val followers: Int? = null,
    val username: String? = null,
    val displayName: String = "",
)

data class MonthlyAwards(
    val month: String? = null,
    val months: List<String> = emptyList(),
    val revelation: RevelationAward? = null,
    val employee: EmployeeAward? = null,
    val local: LocalAward? = null,
    val influencer: InfluencerAward? = null,
)

data class LeaderboardEntry(
    val rank: Int = 0,
    val venueId: String = "",
    val name: String = "",
    val score: Double = 0.0,
    val movement: Int? = null,
)

data class LoyaltyProgram(
    val id: String = "",
    val venueName: String = "",
    val neighborhood: String = "",
    val rewardTitle: String = "",
    val stampsRequired: Int = 6,
    val iconId: String = "heart",
    val accentColor: String = "#B3261E",
    val stampsCollected: Int = 0,
    val redeemedCount: Int = 0,
    val qrSeed: String = "",
    val isCustomVendor: Boolean? = null,
)

data class UserSocialLink(
    val platform: String = "",
    val url: String = "",
    val verified: Boolean = false,
    val followers: Int? = null,
)

data class UserAccount(
    val id: String = "",
    val username: String? = null,
    val name: String = "",
    val email: String? = null,
    val role: String = "tourist",
    val isInfluencer: Boolean? = null,
    val followers: Int? = null,
    val neighborhood: String? = null,
    val weightMultiplier: Double = 1.0,
    val description: String = "",
    val interests: List<String> = emptyList(),
    val savedVenueSlugs: List<String> = emptyList(),
    val socialLinks: List<UserSocialLink> = emptyList(),
)

data class ReviewQuestionSpec(
    val key: String = "",
    val theme: String = "",
    val label: String = "",
    val question: String = "",
    val claim: String = "",
    val ownerDeclarable: Boolean = false,
)

data class InterestSpec(
    val key: String = "",
    val label: String = "",
    val hint: String = "",
)

data class AdBanner(
    val id: String = "",
    val advertiser: String = "",
    val creativeUrl: String = "",
    val linkUrl: String = "",
    val placement: String = "",
)

data class TrapSummary(
    val slug: String = "",
    val name: String = "",
    val neighborhood: String? = null,
    val touristTrapIndex: Int = 0,
    val trapTier: String = "mixed-fair",
    val reasons: List<String> = emptyList(),
)

data class OutingPoll(
    val token: String = "",
    val venueIds: List<String> = emptyList(),
    val counts: Map<String, Int> = emptyMap(),
    val myVote: String? = null,
    val totalVotes: Int = 0,
    val shareUrl: String? = null,
    val voterToken: String? = null,
)

data class TasteTourStop(
    val restaurant: Restaurant,
    val itemName: String,
    val priceRon: Double,
    val categoryId: String,
)

data class TasteTourResult(
    val stops: List<TasteTourStop>,
    val totalRon: Double,
    val approximateDistanceKm: Double,
    val walkingMinutes: Int,
)

data class TimisoaraSeedCatalog(
    val version: Int = 1,
    val city: CityMetadata = CityMetadata(),
    val foodVenues: List<Restaurant> = emptyList(),
    val drinkVenues: List<Restaurant> = emptyList(),
    val weekendEvents: List<WeekendEvent> = emptyList(),
    val topReviewers: List<TopReviewer> = emptyList(),
    val foodHeroHeaders: List<FoodHeroHeader> = emptyList(),
    val drinkHeroHeaders: List<String> = emptyList(),
    val publicVoteCategories: Map<String, Map<String, List<PublicVoteCategoryTop>>> = emptyMap(),
    val defaultLoyaltyPrograms: List<LoyaltyProgram> = emptyList(),
    val interests: List<InterestSpec> = emptyList(),
    val questions: List<ReviewQuestionSpec> = emptyList(),
)

data class ApiErrorBody(
    val code: String = "internal_error",
    val message: String = "Eroare necunoscută.",
    val details: Map<String, Any>? = null,
)

data class ApiEnvelope<T>(
    val ok: Boolean = false,
    val data: T? = null,
    val error: ApiErrorBody? = null,
)
