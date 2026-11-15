package ro.topfood.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import ro.topfood.app.data.model.Coordinates
import ro.topfood.app.data.model.DomainLogic
import ro.topfood.app.data.model.MenuCategory
import ro.topfood.app.data.model.MenuItem
import ro.topfood.app.data.model.PublicVoteCategoryEntry
import ro.topfood.app.data.model.PublicVoteCategoryTop
import ro.topfood.app.data.model.Restaurant
import ro.topfood.app.data.model.Review
import ro.topfood.app.data.model.ReviewCounts
import ro.topfood.app.data.model.SignatureDish
import ro.topfood.app.data.model.TeamMember
import ro.topfood.app.data.model.TrapTier
import ro.topfood.app.data.model.Vertical

class DomainLogicTest {

    @Test
    fun formatScore_usesRomanianComma() {
        assertEquals("8,5", DomainLogic.formatScore(8.5))
        assertEquals("9,0", DomainLogic.formatScore(9.0))
        assertEquals("10,0", DomainLogic.formatScore(10.0))
    }

    @Test
    fun getTrapTier_mapsAllThresholdsCorrectly() {
        assertEquals(TrapTier.LOCAL_STAPLE, DomainLogic.getTrapTier(0))
        assertEquals(TrapTier.LOCAL_STAPLE, DomainLogic.getTrapTier(25))
        assertEquals(TrapTier.MIXED_FAIR, DomainLogic.getTrapTier(26))
        assertEquals(TrapTier.MIXED_FAIR, DomainLogic.getTrapTier(60))
        assertEquals(TrapTier.TOURIST_TRAP, DomainLogic.getTrapTier(61))
        assertEquals(TrapTier.TOURIST_TRAP, DomainLogic.getTrapTier(95))
    }

    @Test
    fun normalizeRo_stripsDiacriticsAndLowercases() {
        assertEquals("timisoara staia", DomainLogic.normalizeRo("  Timișoara ȘȚĂÎÂ "))
        assertEquals("bistro-cetatuie", DomainLogic.toCandidateSlug("Bistro Cetățuie!"))
    }

    @Test
    fun recalculateVenueWithReview_respectsRoleWeightsAndVerifiedVisitAndTeamPraise() {
        val baseVenue = Restaurant(
            id = "v1",
            slug = "bistro-test",
            name = "Bistro Test",
            foodQualityScore = 7.0,
            localsScore = 7.0,
            touristsScore = 7.0,
            touristTrapIndex = 20,
            reviewCounts = ReviewCounts(locals = 4, tourists = 2, influencers = 1),
            team = listOf(TeamMember(name = "Radu", role = "Ospătar", positiveMentions = 3)),
        )

        val localVerifiedReview = Review(
            id = "r-local",
            authorName = "Andreea",
            authorRole = "verified-local",
            isVerifiedVisit = true,
            weightMultiplier = 2.6,
            foodScore = 10.0,
            trapEstimatePct = 10,
            praisedEmployee = "Radu",
            text = "Super ciorbă!",
        )

        val influencerPaidReview = Review(
            id = "r-inf",
            authorName = "CreatorX",
            authorRole = "influencer",
            isVerifiedVisit = false,
            isPaidCollab = true,
            weightMultiplier = 0.2,
            foodScore = 10.0,
            trapEstimatePct = 10,
            text = "Super promoție!",
        )

        val afterLocal = DomainLogic.recalculateVenueWithReview(baseVenue, localVerifiedReview)
        val afterInfluencer = DomainLogic.recalculateVenueWithReview(baseVenue, influencerPaidReview)

        assertTrue(
            "Local verified review (2.6x) must move score significantly more than paid influencer (0.2x)",
            afterLocal.foodQualityScore > afterInfluencer.foodQualityScore,
        )
        assertEquals(5, afterLocal.reviewCounts?.locals)
        assertEquals(4, afterLocal.team.first().positiveMentions)
        assertEquals(1, afterLocal.verifiedVisitCount)
        assertEquals(2, afterInfluencer.reviewCounts?.influencers)
    }

    @Test
    fun eligibleSponsoredVenues_capsAtThreeAndBlocksTrapsAbove80() {
        val candidates = listOf(
            Restaurant(id = "s1", slug = "s1", name = "S1", isSponsored = true, touristTrapIndex = 15),
            Restaurant(id = "s-trap", slug = "s-trap", name = "Trap", isSponsored = true, touristTrapIndex = 80),
            Restaurant(id = "s2", slug = "s2", name = "S2", isSponsored = true, touristTrapIndex = 40),
            Restaurant(id = "organic", slug = "organic", name = "Organic", isSponsored = false, touristTrapIndex = 10),
            Restaurant(id = "s3", slug = "s3", name = "S3", isSponsored = true, touristTrapIndex = 20),
            Restaurant(id = "s4", slug = "s4", name = "S4", isSponsored = true, touristTrapIndex = 25),
        )

        val eligible = DomainLogic.eligibleSponsoredVenues(candidates)

        assertEquals(3, eligible.size)
        assertFalse(eligible.any { it.id == "s-trap" })
        assertFalse(eligible.any { it.id == "organic" })
        assertEquals(listOf("s1", "s2", "s3"), eligible.map { it.id })
    }

    @Test
    fun computeWalkingTasteTour_buildsStopsWithinBudgetAndSkipsTraps() {
        val center = Coordinates(45.7558, 21.2286)
        val pizzaPlace = Restaurant(
            id = "p1",
            slug = "pizza-local",
            name = "Pizza Local",
            cuisine = "Pizzerie",
            touristTrapIndex = 15,
            coordinates = Coordinates(45.7562, 21.2290),
            whatToOrder = listOf(SignatureDish(name = "Pizza Margherita", priceRon = 36.0)),
        )
        val trapBurger = Restaurant(
            id = "b-trap",
            slug = "burger-trap",
            name = "Burger Trap",
            cuisine = "Burger",
            touristTrapIndex = 75,
            coordinates = Coordinates(45.7559, 21.2287),
            whatToOrder = listOf(SignatureDish(name = "Burger Cheap", priceRon = 20.0)),
        )
        val fairBurger = Restaurant(
            id = "b1",
            slug = "burger-bun",
            name = "Burger Bun",
            cuisine = "Burger",
            touristTrapIndex = 20,
            coordinates = Coordinates(45.7570, 21.2300),
            menuCategories = listOf(
                MenuCategory(
                    title = "Burgeri",
                    items = listOf(MenuItem(name = "Smash Burger", priceRon = 42.0)),
                )
            ),
        )

        val tour = DomainLogic.computeWalkingTasteTour(
            restaurants = listOf(pizzaPlace, trapBurger, fairBurger),
            selectedCategories = listOf("pizza", "burger"),
            budgetRon = 90.0,
            stopCount = 2,
            start = center,
        )

        assertNotNull(tour)
        assertEquals(2, tour!!.stops.size)
        assertFalse(tour.stops.any { it.restaurant.id == "b-trap" })
        assertTrue(tour.totalRon <= 90.0)
        assertTrue(tour.walkingMinutes >= 4)
    }

    @Test
    fun mergeCategoryTopWithVotes_mergesExtraVotesAndReranks() {
        val baseCategory = PublicVoteCategoryTop(
            id = "burger",
            title = "Cel mai bun burger",
            shortLabel = "Burger",
            totalVotes = 15,
            top3 = listOf(
                PublicVoteCategoryEntry(
                    rank = 1,
                    venueName = "Burger Unu",
                    venueSlug = "burger-unu",
                    neighborhood = "Cetate",
                    dishHighlight = "Classic Smash",
                    votes = 10,
                    voteSharePct = 67,
                ),
                PublicVoteCategoryEntry(
                    rank = 2,
                    venueName = "Burger Doi",
                    venueSlug = "burger-doi",
                    neighborhood = "Iosefin",
                    dishHighlight = "Double Cheese",
                    votes = 5,
                    voteSharePct = 33,
                ),
            ),
        )

        val venues = listOf(
            Restaurant(
                id = "1",
                slug = "burger-unu",
                name = "Burger Unu",
                vertical = "food",
                cuisine = "Burger",
                touristTrapIndex = 12,
            ),
            Restaurant(
                id = "2",
                slug = "burger-doi",
                name = "Burger Doi",
                vertical = "food",
                cuisine = "Burger",
                touristTrapIndex = 18,
            ),
            Restaurant(
                id = "3",
                slug = "burger-trap",
                name = "Burger Sponsored Trap",
                vertical = "food",
                cuisine = "Burger",
                isSponsored = true,
                touristTrapIndex = 70,
            ),
        )

        val computed = DomainLogic.mergeCategoryTopWithVotes(
            category = baseCategory,
            venues = venues,
            vertical = Vertical.FOOD,
            extraVotesBySlug = mapOf("burger-doi" to 8),
        )

        assertEquals(23, computed.totalVotes)
        assertEquals("burger-doi", computed.top3.first().venueSlug)
        assertEquals(13, computed.top3.first().votes)
        assertFalse(computed.allNominees.any { it.venueSlug == "burger-trap" })
    }
}
