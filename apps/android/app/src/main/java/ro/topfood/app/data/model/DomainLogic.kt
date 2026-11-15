package ro.topfood.app.data.model

import java.text.Normalizer
import java.util.Locale
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

object DomainLogic {
    const val POSSIBLE_TRAP_THRESHOLD = 35
    const val TRAP_THRESHOLD = 65
    const val SPONSORED_MAX_TRAP_INDEX = 80
    const val MAX_SPONSORED_SLOTS = 3
    const val TIMISOARA_CHECKIN_RADIUS_KM = 15.0

    fun getTrapTier(touristTrapIndex: Int): TrapTier = when {
        touristTrapIndex <= 25 -> TrapTier.LOCAL_STAPLE
        touristTrapIndex <= 60 -> TrapTier.MIXED_FAIR
        else -> TrapTier.TOURIST_TRAP
    }

    fun formatScore(score: Double): String {
        return String.format(Locale.US, "%.1f", score).replace('.', ',')
    }

    fun formatRon(amount: Double): String {
        return if (amount % 1.0 == 0.0) {
            "${amount.toInt()} lei"
        } else {
            String.format(Locale.US, "%.1f lei", amount).replace('.', ',')
        }
    }

    fun normalizeRo(input: String): String {
        val decomposed = Normalizer.normalize(input, Normalizer.Form.NFD)
        return decomposed
            .replace(Regex("\\p{InCombiningDiacriticalMarks}+"), "")
            .lowercase(Locale.ROOT)
            .trim()
    }

    fun toCandidateSlug(name: String): String {
        return normalizeRo(name)
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
    }

    fun haversineKm(a: Coordinates, b: Coordinates): Double {
        val r = 6371.0
        val dLat = (b.lat - a.lat) * PI / 180.0
        val dLng = (b.lng - a.lng) * PI / 180.0
        val lat1 = a.lat * PI / 180.0
        val lat2 = b.lat * PI / 180.0
        val sinDLat = sin(dLat / 2.0)
        val sinDLng = sin(dLng / 2.0)
        val h = sinDLat * sinDLat + cos(lat1) * cos(lat2) * sinDLng * sinDLng
        val c = 2.0 * atan2(sqrt(h), sqrt(max(0.0, 1.0 - h)))
        return r * c
    }

    /**
     * Product Rule #3: Sponsored slots are visibly separated and NEVER sit inside organic rankings,
     * capped at 3 slots, and completely blocked if touristTrapIndex >= 80.
     */
    fun eligibleSponsoredVenues(venues: List<Restaurant>): List<Restaurant> {
        return venues
            .filter { it.isSponsored && it.touristTrapIndex < SPONSORED_MAX_TRAP_INDEX }
            .take(MAX_SPONSORED_SLOTS)
    }

    /**
     * Product Rule #1 & Bayesian Score Recalculation:
     * Matches apps/web/src/data/restaurants.ts `recalculateRestaurantWithReview`
     * - Verified local = 2.0x weight (or 2.6x with verified visit x1.3)
     * - Verified visit = x1.3 multiplier
     * - Regular/tourist = 1.0x
     * - Declared paid influencer = 0.2x
     */
    fun recalculateVenueWithReview(
        restaurant: Restaurant,
        newReview: Review,
    ): Restaurant {
        val updatedReviews = listOf(newReview) + restaurant.reviews
        val prevCounts = restaurant.reviewCounts ?: ReviewCounts()

        val baselineWeight = max(
            12.0,
            prevCounts.locals * 2.0 + prevCounts.tourists * 1.0 + prevCounts.influencers * 0.2
        )
        val reviewWeight = newReview.weightMultiplier

        val newFoodQualityScore = ((restaurant.foodQualityScore * baselineWeight + newReview.foodScore * reviewWeight) /
            (baselineWeight + reviewWeight))
            .let { (it * 10.0).roundToInt() / 10.0 }
            .coerceIn(1.0, 10.0)

        val newTrapIndex = ((restaurant.touristTrapIndex * baselineWeight + newReview.trapEstimatePct * reviewWeight) /
            (baselineWeight + reviewWeight))
            .roundToInt()
            .coerceIn(0, 100)

        val isLocalReviewer = newReview.authorRole == "verified-local" || newReview.authorRole == "regular"
        val localsBaseline = max(8.0, prevCounts.locals * 2.0)
        val newLocalsScore = if (isLocalReviewer) {
            ((restaurant.localsScore * localsBaseline + newReview.foodScore * reviewWeight) /
                (localsBaseline + reviewWeight))
                .let { (it * 10.0).roundToInt() / 10.0 }
                .coerceIn(1.0, 10.0)
        } else {
            restaurant.localsScore
        }

        val touristsBaseline = max(6.0, prevCounts.tourists * 1.0)
        val newTouristsScore = if (newReview.authorRole == "tourist") {
            ((restaurant.touristsScore * touristsBaseline + newReview.foodScore) /
                (touristsBaseline + 1.0))
                .let { (it * 10.0).roundToInt() / 10.0 }
                .coerceIn(1.0, 10.0)
        } else {
            restaurant.touristsScore
        }

        val updatedCounts = ReviewCounts(
            locals = prevCounts.locals + if (isLocalReviewer) 1 else 0,
            tourists = prevCounts.tourists + if (newReview.authorRole == "tourist") 1 else 0,
            influencers = prevCounts.influencers + if (newReview.authorRole == "influencer") 1 else 0,
        )

        val updatedTeam = restaurant.team.map { member ->
            if (!newReview.praisedEmployee.isNullOrBlank() && member.name == newReview.praisedEmployee) {
                member.copy(positiveMentions = member.positiveMentions + 1)
            } else {
                member
            }
        }

        return restaurant.copy(
            foodQualityScore = newFoodQualityScore,
            localsScore = newLocalsScore,
            touristsScore = newTouristsScore,
            touristTrapIndex = newTrapIndex,
            trapTier = getTrapTier(newTrapIndex).wireValue,
            reviewCounts = updatedCounts,
            reviews = updatedReviews,
            team = updatedTeam,
            verifiedVisitCount = (restaurant.verifiedVisitCount ?: 0) + if (newReview.isVerifiedVisit) 1 else 0,
        )
    }

    fun recalculateVenueWithUpdatedReview(
        restaurant: Restaurant,
        reviewId: String,
        newScore: Double,
        newText: String,
    ): Restaurant {
        val existing = restaurant.reviews.find { it.id == reviewId } ?: return restaurant
        val updatedReviews = restaurant.reviews.map { r ->
            if (r.id == reviewId) {
                val baseDate = r.date.replace(Regex("\\s*\\(editat\\)$"), "")
                r.copy(foodScore = newScore, text = newText, date = "$baseDate (editat)")
            } else {
                r
            }
        }
        val prevCounts = restaurant.reviewCounts ?: ReviewCounts()
        val baselineWeight = max(
            12.0,
            prevCounts.locals * 2.0 + prevCounts.tourists * 1.0 + prevCounts.influencers * 0.2
        )
        val delta = (newScore - existing.foodScore) * existing.weightMultiplier
        val updatedQuality = (restaurant.foodQualityScore + delta / baselineWeight)
            .coerceIn(1.0, 10.0)
            .let { (it * 10.0).roundToInt() / 10.0 }

        return restaurant.copy(
            foodQualityScore = updatedQuality,
            reviews = updatedReviews,
        )
    }

    fun recalculateVenueWithoutReview(
        restaurant: Restaurant,
        reviewId: String,
    ): Restaurant {
        val existing = restaurant.reviews.find { it.id == reviewId } ?: return restaurant
        val updatedReviews = restaurant.reviews.filterNot { it.id == reviewId }
        val prevCounts = restaurant.reviewCounts ?: ReviewCounts()
        val isLocal = existing.authorRole == "verified-local" || existing.authorRole == "regular"
        val updatedCounts = ReviewCounts(
            locals = max(0, prevCounts.locals - if (isLocal) 1 else 0),
            tourists = max(0, prevCounts.tourists - if (existing.authorRole == "tourist") 1 else 0),
            influencers = max(0, prevCounts.influencers - if (existing.authorRole == "influencer") 1 else 0),
        )
        val baselineWeight = max(
            12.0,
            prevCounts.locals * 2.0 + prevCounts.tourists * 1.0 + prevCounts.influencers * 0.2
        )
        val remainingWeight = max(1.0, baselineWeight - existing.weightMultiplier)
        val updatedQuality = ((restaurant.foodQualityScore * baselineWeight - existing.foodScore * existing.weightMultiplier) /
            remainingWeight)
            .coerceIn(1.0, 10.0)
            .let { (it * 10.0).roundToInt() / 10.0 }

        return restaurant.copy(
            foodQualityScore = updatedQuality,
            reviewCounts = updatedCounts,
            reviews = updatedReviews,
        )
    }

    fun filterAndSortVenues(
        venues: List<Restaurant>,
        vertical: Vertical,
        searchQuery: String = "",
        foodFilters: Set<String> = emptySet(),
        drinkFilters: Set<String> = emptySet(),
        selectedNeighborhood: String = "all",
        selectedCategory: String? = null,
        sortOrder: SortOrder = SortOrder.HONEST,
    ): List<Restaurant> {
        val q = normalizeRo(searchQuery)
        val filtered = venues.filter { venue ->
            if (!selectedCategory.isNullOrBlank()) {
                val catNorm = normalizeRo(selectedCategory)
                val inCats = venue.categories.any { normalizeRo(it) == catNorm }
                if (!inCats && normalizeRo(venue.cuisine) != catNorm) return@filter false
            }

            if (selectedNeighborhood != "all") {
                val hoodNorm = normalizeRo(selectedNeighborhood)
                val matchHood = normalizeRo(venue.neighborhood).contains(hoodNorm) ||
                    normalizeRo(venue.shortNeighborhood ?: "").contains(hoodNorm)
                if (!matchHood) return@filter false
            }

            if (q.isNotBlank()) {
                val haystack = normalizeRo(
                    "${venue.name} ${venue.cuisine} ${venue.shortCategory ?: ""} ${venue.neighborhood} ${venue.shortNeighborhood ?: ""} ${venue.editorialHeadline} ${venue.address} ${venue.whatToOrder.joinToString(" ") { it.name }}"
                )
                if (!haystack.contains(q)) return@filter false
            }

            if (vertical == Vertical.FOOD) {
                if ("fara-capcane" in foodFilters && venue.touristTrapIndex >= POSSIBLE_TRAP_THRESHOLD) return@filter false
                if ("deschis-acum" in foodFilters && !venue.openNow) return@filter false
                if ("sub-50-lei" in foodFilters && venue.avgMealPriceRon > 50.0) return@filter false
                if ("livrare" in foodFilters && venue.delivery?.available != true) return@filter false
            } else {
                if ("vineri-noaptea" in drinkFilters && !venue.drinkTags.contains("vineri-noaptea") && !venue.openNow) return@filter false
                if ("in-timpul-saptamanii" in drinkFilters && !venue.drinkTags.contains("in-timpul-saptamanii")) return@filter false
                if ("muzica-live" in drinkFilters && !venue.drinkTags.contains("muzica-live")) return@filter false
                if ("bere-sub-15-lei" in drinkFilters && !venue.drinkTags.contains("bere-sub-15-lei") && venue.avgMealPriceRon > 35.0) return@filter false
            }

            true
        }

        return when (sortOrder) {
            SortOrder.HONEST -> filtered.sortedByDescending { it.foodQualityScore }
            SortOrder.TRAP_ASC -> filtered.sortedWith(
                compareBy<Restaurant> { it.touristTrapIndex }.thenByDescending { it.foodQualityScore }
            )
            SortOrder.PRICE_ASC -> filtered.sortedWith(
                compareBy<Restaurant> { it.avgMealPriceRon }.thenByDescending { it.foodQualityScore }
            )
            SortOrder.REVIEWS -> filtered.sortedWith(
                compareByDescending<Restaurant> { it.reviewCounts?.total ?: it.reviews.size }
                    .thenByDescending { it.foodQualityScore }
            )
        }
    }

    val MAP_TASTES: List<Pair<String, List<String>>> = listOf(
        "burger" to listOf("burger"),
        "pizza" to listOf("pizza"),
        "pasta" to listOf("paste", "pasta", "spaghetti"),
        "soup" to listOf("ciorb", "sup"),
        "dessert" to listOf("desert", "prajitur", "tort", "inghetata", "papanasi", "tiramisu", "cheesecake"),
        "coffee" to listOf("cafea", "coffee", "espresso", "cappuccino"),
        "beer" to listOf("bere", "beer"),
        "wine" to listOf("vin", "wine"),
        "cocktail" to listOf("cocktail"),
        "vegetarian" to listOf("vegetarian"),
        "vegan" to listOf("vegan"),
    )

    fun matchesMapTaste(venue: Restaurant, tasteId: String?): Boolean {
        if (tasteId.isNullOrBlank()) return true
        val terms = MAP_TASTES.find { it.first == tasteId }?.second ?: return true
        val texts = buildList {
            add(normalizeRo(venue.cuisine))
            add(normalizeRo(venue.shortCategory ?: ""))
            venue.whatToOrder.forEach { add(normalizeRo(it.name)) }
            venue.menuCategories.forEach { cat ->
                add(normalizeRo(cat.title))
                cat.items.forEach { item ->
                    add(normalizeRo("${cat.title} ${item.name} ${item.description ?: ""}"))
                }
            }
        }
        return texts.any { txt -> terms.any { term -> txt.contains(term) } }
    }

    // ---------- Taste Tour Optimizer ----------

    data class TasteCategorySpec(val id: String, val label: String, val terms: List<String>)

    val TASTE_CATEGORIES: List<TasteCategorySpec> = listOf(
        TasteCategorySpec("pizza", "Pizza", listOf("pizza", "pizzerie", "focaccia")),
        TasteCategorySpec("burger", "Burger", listOf("burger", "hamburger", "smash")),
        TasteCategorySpec("soup", "Ciorbă / supă", listOf("ciorba", "supa", "ciorb")),
        TasteCategorySpec("dessert", "Desert", listOf("desert", "dulce", "prajitura", "tort", "inghetata", "clatite", "papanasi", "cheesecake", "tiramisu")),
        TasteCategorySpec("coffee", "Cafea", listOf("cafea", "coffee", "espresso", "cappuccino", "latte")),
        TasteCategorySpec("beer", "Bere", listOf("bere", "beer", "ipa", "halba")),
        TasteCategorySpec("cocktail", "Cocktail", listOf("cocktail", "cocktailuri", "gin", "negroni", "spritz")),
        TasteCategorySpec("romanian", "Mâncare românească", listOf("romanesc", "romaneasca", "sarmale", "mici", "plescavita", "gulas")),
    )

    fun parseTasteCravings(text: String): List<String> {
        val norm = normalizeRo(text)
        if (norm.isBlank()) return emptyList()
        return TASTE_CATEGORIES.filter { cat ->
            cat.terms.any { term -> norm.contains(term) }
        }.map { it.id }
    }

    private fun approxDistanceKm(a: Coordinates, b: Coordinates): Double {
        val lat = (b.lat - a.lat) * 111.32
        val lng = (b.lng - a.lng) * 111.32 * cos((a.lat + b.lat) * PI / 360.0)
        return hypot(lat, lng)
    }

    fun computeWalkingTasteTour(
        restaurants: List<Restaurant>,
        selectedCategories: List<String>,
        budgetRon: Double,
        stopCount: Int = 2,
        start: Coordinates = Coordinates(45.7558, 21.2286),
    ): TasteTourResult? {
        val categories = selectedCategories.distinct()
        if (categories.isEmpty() || stopCount !in 2..3 || categories.size > stopCount || budgetRon <= 0) {
            return null
        }

        val candidates = mutableListOf<TasteTourStop>()
        for (venue in restaurants) {
            if (venue.touristTrapIndex >= 60) continue
            val allItems = buildList {
                venue.whatToOrder.forEach { add(Triple(it.name, it.priceRon, it.name)) }
                venue.menuCategories.forEach { cat ->
                    cat.items.forEach { item ->
                        add(Triple(item.name, item.priceRon, "${cat.title} ${item.name}"))
                    }
                }
            }
            for (catId in categories) {
                val spec = TASTE_CATEGORIES.find { it.id == catId } ?: continue
                val bestMatch = allItems
                    .filter { (_, price, ctx) ->
                        val normCtx = normalizeRo(ctx)
                        price > 0 && !normCtx.contains("de evitat") && spec.terms.any { normCtx.contains(it) }
                    }
                    .minByOrNull { it.second }
                if (bestMatch != null) {
                    candidates.add(
                        TasteTourStop(
                            restaurant = venue,
                            itemName = bestMatch.first,
                            priceRon = bestMatch.second,
                            categoryId = catId,
                        )
                    )
                }
            }
        }

        val orderedCandidates = candidates.sortedWith(
            compareBy<TasteTourStop> { approxDistanceKm(start, it.restaurant.coordinates) }
                .thenBy { it.priceRon }
        )

        val shortlist = categories.flatMap { cat ->
            orderedCandidates.filter { it.categoryId == cat }.take(25)
        }

        var bestResult: TasteTourResult? = null

        fun dfs(chosen: List<TasteTourStop>, totalRon: Double, distKm: Double) {
            if (chosen.size == stopCount) {
                val coversAll = categories.all { cat -> chosen.any { it.categoryId == cat } }
                if (!coversAll) return
                if (bestResult == null || distKm < bestResult!!.approximateDistanceKm) {
                    bestResult = TasteTourResult(
                        stops = chosen.toList(),
                        totalRon = totalRon,
                        approximateDistanceKm = (distKm * 100.0).roundToInt() / 100.0,
                        walkingMinutes = max(4, (distKm / 4.5 * 60.0).roundToInt()),
                    )
                }
                return
            }
            val lastCoord = chosen.lastOrNull()?.restaurant?.coordinates ?: start
            for (cand in shortlist) {
                if (chosen.any { it.restaurant.id == cand.restaurant.id }) continue
                if (totalRon + cand.priceRon > budgetRon) continue
                val stepDist = approxDistanceKm(lastCoord, cand.restaurant.coordinates)
                dfs(chosen + cand, totalRon + cand.priceRon, distKm + stepDist)
            }
        }

        dfs(emptyList(), 0.0, 0.0)
        return bestResult
    }

    // ---------- Monthly Category Voting Merge ----------

    private val CATEGORY_KEYWORDS: Map<String, List<String>> = mapOf(
        "shaorma" to listOf("shaorma", "kebab", "doner", "oriental", "libanez", "lipie", "street food"),
        "burger" to listOf("burger", "smash", "bistro", "american", "angus", "grill"),
        "pizza" to listOf("pizza", "pizzerie", "focaccia", "focacceria", "napoletana", "trattoria", "italian"),
        "mancare-gatita" to listOf("ciorba", "gulas", "papricas", "romanesc", "traditional", "gatita", "sarmale", "banatean", "bistro", "restaurant"),
        "asiatic" to listOf("asiatic", "ramen", "sushi", "thai", "wok", "curry", "vietnamez", "coreean", "noodles", "pho"),
        "brunch" to listOf("brunch", "cafea", "specialitate", "mic dejun", "croissant", "patiserie", "shakshuka", "coffee"),
        "bere" to listOf("bere", "craft", "pub", "berarie", "tap", "ipa", "halba"),
        "cocktail" to listOf("cocktail", "gin", "speakeasy", "bar", "negroni", "sour", "mixology"),
        "atmosfera" to listOf("atmosfera", "terasa", "muzica", "live", "gradina", "cultural", "pub", "jazz", "bar", "bistro"),
    )

    fun mergeCategoryTopWithVotes(
        category: PublicVoteCategoryTop,
        venues: List<Restaurant>,
        vertical: Vertical,
        extraVotesBySlug: Map<String, Int> = emptyMap(),
    ): ComputedCategoryVoteTop {
        data class MutableCandidate(
            val candidateSlug: String,
            val venueName: String,
            val venueSlug: String?,
            val neighborhood: String,
            val dishHighlight: String,
            val votes: Int,
            val baselineOrder: Int,
            val trendLabel: String,
        )

        val seen = linkedMapOf<String, MutableCandidate>()
        category.top3.forEachIndexed { idx, entry ->
            val slug = entry.venueSlug ?: toCandidateSlug(entry.venueName)
            seen[slug] = MutableCandidate(
                candidateSlug = slug,
                venueName = entry.venueName,
                venueSlug = entry.venueSlug,
                neighborhood = entry.neighborhood,
                dishHighlight = entry.dishHighlight,
                votes = entry.votes + (extraVotesBySlug[slug] ?: 0),
                baselineOrder = idx,
                trendLabel = entry.trendLabel,
            )
        }

        val keywords = CATEGORY_KEYWORDS[category.id]
        for (venue in venues) {
            if (venue.isSponsored || venue.touristTrapIndex >= 60) continue
            if ((venue.vertical ?: vertical.apiValue) != vertical.apiValue) continue
            if (seen.containsKey(venue.slug)) continue
            if (keywords != null) {
                val haystack = normalizeRo(
                    listOf(
                        venue.cuisine,
                        venue.shortCategory ?: "",
                        venue.categories.joinToString(" "),
                        venue.occasionTags.joinToString(" "),
                        venue.whatToOrder.joinToString(" ") { "${it.name} ${it.description ?: ""}" },
                    ).joinToString(" ")
                )
                if (keywords.none { haystack.contains(it) }) continue
            }
            seen[venue.slug] = MutableCandidate(
                candidateSlug = venue.slug,
                venueName = venue.name,
                venueSlug = venue.slug,
                neighborhood = venue.shortNeighborhood ?: venue.neighborhood,
                dishHighlight = venue.whatToOrder.firstOrNull()?.name ?: venue.shortCategory ?: venue.cuisine,
                votes = extraVotesBySlug[venue.slug] ?: 0,
                baselineOrder = 100,
                trendLabel = "NOU",
            )
        }

        val sorted = seen.values.sortedWith(
            compareByDescending<MutableCandidate> { it.votes }
                .thenBy { it.baselineOrder }
                .thenBy { it.venueName }
        )

        val totalVotes = sorted.sumOf { it.votes }
        val nominees = sorted.mapIndexed { idx, item ->
            PublicVoteNominee(
                candidateSlug = item.candidateSlug,
                venueName = item.venueName,
                venueSlug = item.venueSlug,
                neighborhood = item.neighborhood,
                dishHighlight = item.dishHighlight,
                votes = item.votes,
                voteSharePct = if (totalVotes > 0) ((item.votes.toDouble() / totalVotes) * 100.0).roundToInt() else 0,
                rank = idx + 1,
                trendLabel = item.trendLabel,
            )
        }

        val top3 = nominees.take(3).map {
            PublicVoteCategoryEntry(
                rank = it.rank,
                venueName = it.venueName,
                venueSlug = it.venueSlug,
                neighborhood = it.neighborhood,
                dishHighlight = it.dishHighlight,
                votes = it.votes,
                voteSharePct = it.voteSharePct,
                trendLabel = it.trendLabel,
            )
        }

        return ComputedCategoryVoteTop(
            id = category.id,
            title = category.title,
            shortLabel = category.shortLabel,
            totalVotes = totalVotes,
            top3 = top3,
            allNominees = nominees,
        )
    }

    fun compassBearingLabel(from: Coordinates, to: Coordinates): Pair<Int, String> {
        val dLng = (to.lng - from.lng) * PI / 180.0
        val lat1 = from.lat * PI / 180.0
        val lat2 = to.lat * PI / 180.0
        val y = sin(dLng) * cos(lat2)
        val x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLng)
        val bearing = ((atan2(y, x) * 180.0 / PI) + 360.0).roundToInt() % 360
        val dir = when {
            bearing < 23 || bearing >= 338 -> "Nord"
            bearing < 68 -> "Nord-Est"
            bearing < 113 -> "Est"
            bearing < 158 -> "Sud-Est"
            bearing < 203 -> "Sud"
            bearing < 248 -> "Sud-Vest"
            bearing < 293 -> "Vest"
            else -> "Nord-Vest"
        }
        return bearing to dir
    }
}
