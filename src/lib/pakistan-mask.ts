// Simplified Pakistan border polygon (approximate coordinates)
// This creates an inverse mask - everything outside Pakistan is covered
export const PAKISTAN_MASK_GEOJSON = {
    "type": "Feature",
    "properties": {},
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                // Outer boundary (world rectangle) - clockwise
                [-180, -90],
                [180, -90],
                [180, 90],
                [-180, 90],
                [-180, -90]
            ],
            [
                // Inner boundary (Pakistan border - hole in the mask) - counter-clockwise
                // Reversed coordinates to create proper hole
                [60.87, 23.69],
                [61.00, 25.08],
                [61.50, 25.20],
                [61.87, 24.97],
                [62.80, 24.55],
                [66.72, 24.86],
                [68.84, 24.27],
                [70.67, 23.78],
                [71.04, 24.36],
                [70.09, 25.72],
                [69.51, 26.55],
                [70.61, 27.05],
                [71.78, 27.94],
                [72.82, 28.96],
                [74.57, 29.84],
                [75.39, 30.38],
                [74.67, 31.03],
                [73.50, 31.38],
                [74.07, 32.76],
                [73.92, 33.72],
                [74.24, 34.75],
                [75.76, 34.50],
                [76.87, 34.65],
                [77.04, 35.51],
                [75.85, 36.66],
                [74.24, 35.02],
                [73.93, 34.64],
                [74.53, 34.35],
                [74.90, 33.43],
                [75.26, 32.27],
                [74.42, 30.98],
                [73.45, 29.97],
                [71.78, 27.91],
                [70.29, 28.03],
                [70.65, 27.06],
                [71.05, 26.32],
                [70.47, 25.72],
                [70.17, 24.36],
                [68.18, 24.30],
                [66.22, 25.27],
                [64.15, 25.24],
                [62.91, 24.88],
                [61.78, 24.12],
                [60.87, 23.69]
            ]
        ]
    }
};
