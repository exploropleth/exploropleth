import * as d3 from "d3";

// COLOR_SCHEMES defines all available color palettes, grouped by type
export const COLOR_SCHEMES = [{
    "name": "Categorical", // Discrete color schemes for categories
    "examples": [{
        "sname": "Accent",
        "file": "Accent",
        "code": "accent",
        "function": d3.schemeAccent
    },
    {
        "sname": "Category 10",
        "file": "Category10",
        "code": "category10",
        "function": d3.schemeCategory10
    },
    {
        "sname": "Dark 2",
        "file": "Dark2",
        "code": "dark2",
        "function": d3.schemeDark2
    },
    {
        "sname": "Paired",
        "file": "Paired",
        "code": "paired",
        "function": d3.schemePaired
    },
    {
        "sname": "Pastel 1",
        "file": "Pastel1",
        "code": "pastel1",
        "function": d3.schemePastel1
    },
    {
        "sname": "Pastel 2",
        "file": "Pastel2",
        "code": "pastel2",
        "function": d3.schemePastel2
    },
    {
        "sname": "Set 1",
        "file": "Set1",
        "code": "set1",
        "function": d3.schemeSet1
    },
    {
        "sname": "Set 2",
        "file": "Set2",
        "code": "set2",
        "function": d3.schemeSet2
    },
    {
        "sname": "Set 3",
        "file": "Set3",
        "code": "set3",
        "function": d3.schemeSet3
    },
    {
        "sname": "Tableau 10",
        "file": "Tableau10",
        "code": "tableau10",
        "function": d3.schemeTableau10
    }]
},
{
    "name": "Sequential Single-Hue", // Single-hue gradients for ordered data
    "examples": [{
        "sname": "Blues",
        "file": "Blues",
        "code": "blues",
        "function": d3.schemeBlues,
        "interpolator": d3.interpolateBlues
    }, 
    {
        "sname": "Greens",
        "file": "Greens",
        "code": "greens",
        "function": d3.schemeGreens,
        "interpolator": d3.interpolateGreens
    }, 
    {
        "sname": "Oranges",
        "file": "Oranges",
        "code": "oranges",
        "function": d3.schemeOranges,
        "interpolator": d3.interpolateOranges
    }, {
        "sname": "Reds",
        "file": "Reds",
        "code": "reds",
        "function": d3.schemeReds,
        "interpolator": d3.interpolateReds
    }, {
        "sname": "Purples",
        "file": "Purples",
        "code": "purples",
        "function": d3.schemePurples,
        "interpolator": d3.interpolatePurples
    }, 
    {
        "sname": "Greys",
        "file": "Greys",
        "code": "greys",
        "function": d3.schemeGreys,
        "interpolator": d3.interpolateGreys
    }]
},
{
    "name": "Sequential Multi-Hue", // Multi-hue gradients for ordered data
    "examples": [{
        "sname": "Turbo",
        "file": "Turbo",
        "code": "turbo",
        "interpolator": d3.interpolateTurbo
    },
    {
        "sname": "Magma",
        "file": "Magma",
        "code": "magma",
        "interpolator": d3.interpolateMagma
    },
    {
        "sname": "Viridis",
        "file": "Viridis",
        "code": "viridis",
        "interpolator": d3.interpolateViridis
    },
    {
        "sname": "Inferno",
        "file": "Inferno",
        "code": "inferno",
        "interpolator": d3.interpolateInferno
    },
    {
        "sname": "Cividis",
        "file": "Cividis",
        "code": "cividis",
        "interpolator": d3.interpolateCividis
    },
    {
        "sname": "Blue-Green",
        "file": "BuGn",
        "code": "bluegreen",
        "function": d3.schemeBuGn,
        "interpolator": d3.interpolateBuGn
    },
    {
        "sname": "Blue-Purple",
        "file": "BuPu",
        "code": "bluepurple",
        "function": d3.schemeBuPu,
        "interpolator": d3.interpolateBuPu
    },
    {
        "sname": "Green-Blue",
        "file": "GnBu",
        "code": "greenblue",
        "function": d3.schemeGnBu,
        "interpolator": d3.interpolateGnBu
    },
    {
        "sname": "Orange-Red",
        "file": "OrRd",
        "code": "orangered",
        "function": d3.schemeOrRd,
        "interpolator": d3.interpolateOrRd
    },
    {
        "sname": "Purple-Blue-Green",
        "file": "PuBuGn",
        "code": "purplebluegreen",
        "function": d3.schemePuBuGn,
        "interpolator": d3.interpolatePuBuGn
    },
    {
        "sname": "Purple-Blue",
        "file": "PuBu",
        "code": "purpleblue",
        "function": d3.schemePuBu,
        "interpolator": d3.interpolatePuBu
    },
    {
        "sname": "Purple-Red",
        "file": "PuRd",
        "code": "purplered",
        "function": d3.schemePuRd,
        "interpolator": d3.interpolatePuRd
    },
    {
        "sname": "Red-Purple",
        "file": "RdPu",
        "code": "redpurple",
        "function": d3.schemeRdPu,
        "interpolator": d3.interpolateRdPu
    },
    {
        "sname": "Yellow-Green-Blue",
        "file": "YlGnBu",
        "code": "yellowgreenblue",
        "function": d3.schemeYlGnBu,
        "interpolator": d3.interpolateYlGnBu
    },
    {
        "sname": "Yellow-Green",
        "file": "YlGn",
        "code": "yellowgreen",
        "function": d3.schemeYlGn,
        "interpolator": d3.interpolateYlGn
    },
    {
        "sname": "Yellow-Orange-Brown",
        "file": "YlOrBr",
        "code": "yelloworangebrown",
        "function": d3.schemeYlOrBr,
        "interpolator": d3.interpolateYlOrBr
    },
    {
        "sname": "Yellow-Orange-Red",
        "file": "YlOrRd",
        "code": "yelloworangered",
        "function": d3.schemeYlOrRd,
        "interpolator": d3.interpolateYlOrRd
    }]
},
{
    "name": "Diverging", // Diverging color schemes for data with a critical midpoint
    "examples": [
        {
        "sname": "Brown-Blue-Green",
        "file": "BrBG",
        "code": "brownbluegreen",
        "function": d3.schemeBrBG,
        "interpolator": d3.interpolateBrBG
    },
    {
        "sname": "Pink-Yellow-Green",
        "file": "PiYG",
        "code": "pinkyellowgreen",
        "function": d3.schemePiYG,
        "interpolator": d3.interpolatePiYG
    },
    {
        "sname": "Purple-Orange",
        "file": "PuOr",
        "code": "purpleorange",
        "function": d3.schemePuOr,
        "interpolator": d3.interpolatePuOr
    },
    {
        "sname": "Red-Blue",
        "file": "RdBu",
        "code": "redblue",
        "function": d3.schemeRdBu,
        "interpolator": d3.interpolateRdBu
    },
    {
        "sname": "Red-Grey",
        "file": "RdGy",
        "code": "redgrey",
        "function": d3.schemeRdGy,
        "interpolator": d3.interpolateRdGy
    },
    {
        "sname": "Red-Yellow-Blue",
        "file": "RdYlBu",
        "code": "redyellowblue",
        "function": d3.schemeRdYlBu,
        "interpolator": d3.interpolateRdYlBu
    },
    {
        "sname": "Red-Yellow-Green",
        "file": "RdYlGn",
        "code": "redyellowgreen",
        "function": d3.schemeRdYlGn,
        "interpolator": d3.interpolateRdYlGn
    },
    {
        "sname": "Spectral",
        "file": "Spectral",
        "code": "spectral",
        "function": d3.schemeSpectral,
        "interpolator": d3.interpolateSpectral
    }
    ]
},
{
    "name": "Cyclical", // Cyclical color schemes for periodic data
    "examples": [{
        "sname": "Rainbow",
        "file": "Rainbow",
        "code": "rainbow",
        "interpolator": d3.interpolateRainbow
    },
    {
        "sname": "Sinebow",
        "file": "Sinebow",
        "code": "sinebow",
        "interpolator": d3.interpolateSinebow
    }]
}
]