// Core configuration for available features per geography and country
let BASE_FEATURES = {
    "usa": {
        "county": {
            // Data file and features for US counties
            featureFile: "us-county-indicators.csv",
            features: [
                "Life Expectancy", "Adult Obesity Percentage", "Infant Mortality Rate", "Incarceration Rate", "Incarceration_Rate_1k", "HIV_Prevalence", "Motor Vehicle Death Rate", "Secondary Educational Attainment", "GINI Index (Income Inequality)", "Population Density"
            ],
            labelFeatures: ["State", "County"],
            primaryKey: "FIPS_Code",
        },
        "state": {
            // Data file and features for US states
            featureFile: "us-state-indicators.csv",
            features: [
                "population", "sq_miles", "pop_density"
            ],
            labelFeatures: ["state_code"],
            primaryKey: "state"
        }
    },
    "india": {
        "state": {
            // Data file and features for Indian states/UTs
            featureFile: "india-state-ut-indicators.csv",
            features: ["Infant Mortality Rate", "Total Fertility Rate (Children per women)", "Population Density", "Death Rate", "Birth Rate"],
            labelFeatures: ["Category"],
            primaryKey: "State/UT"
        }
    }
}

// Core configuration for available geographies per country
let BASE_GEOGRAPHIES = {
    "usa": {
        "county": {
            // GeoJSON/topoJSON and map settings for US counties
            geoFile: "us-counties.json",
            mapProjection: "albersUsa",
            mapCenter: [98.5795, 39.8283],
            topoFeatureRootKey: "counties",
            topoPrimaryKey: "id"
        },
        "state": {
            // GeoJSON/topoJSON and map settings for US states
            geoFile: "us-states.json",
            mapProjection: "albersUsa",
            mapCenter: [98.5795, 39.8283],
            topoFeatureRootKey: "states",
            topoPrimaryKey: "id"
        }
    },
    "india": {
        "state": {
            // GeoJSON/topoJSON and map settings for Indian states/UTs
            geoFile: "india-states-uts.json",
            mapProjection: "mercator",
            mapCenter: [78.9629, 20.5937],
            topoFeatureRootKey: "india-states-uts",
            topoPrimaryKey: "id"
        }
    }
}

// High-level dataset structure for UI and selection
let BASE_DATASET = [
    {
        "name": "India",
        "code": "india",
        "geographies": [
            {
                "name": "State",
                "code": "state",
                "features": [] // Will be populated below
            }
        ]
    },
    {
        "name": "United States",
        "code": "usa",
        "geographies": [
            {
                "name": "County",
                "code": "county",
                "features": [] // Will be populated below
            },
            {
                "name": "State",
                "code": "state",
                "features": [] // Will be populated below
            }
        ]
    }
];

// Populate BASE_DATASET with combined feature and geography info
BASE_DATASET.forEach(function(dataset){
    dataset["geographies"].forEach(function(geography){
        let geoData = BASE_GEOGRAPHIES[dataset["code"]][geography["code"]];
        let featureData = BASE_FEATURES[dataset["code"]][geography["code"]];
        let combinedData = { ...geoData, ...featureData };
        featureData["features"].forEach(function(feature){
            let featureObj = { ...combinedData, feature };
            geography["features"].push(featureObj);
        });
    });
});

// Export the final datasets for use in the app
export let DATASETS = BASE_DATASET;