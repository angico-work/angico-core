package com.angico.core.geocoding;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/geocoding")
public class GeocodingController {

    private final GeocodingService geocodingService;

    public GeocodingController(GeocodingService geocodingService) {
        this.geocodingService = geocodingService;
    }

    @GetMapping("/search")
    public GeocodingSearchResponse search(
            @RequestParam String q,
            @RequestParam(required = false) String country
    ) {
        return geocodingService.search(q, country);
    }

    @GetMapping("/reverse")
    public GeocodingResult reverse(
            @RequestParam Double lat,
            @RequestParam Double lng
    ) {
        return geocodingService.reverse(lat, lng);
    }
}
