# Exploropleth: Exploratory Analysis of Data Binning Methods in Choropleth Maps

| ![Exploropleth Demo](teaser.gif)|
|-|

When creating choropleth maps, mapmakers often bin (i.e., group, classify) quantitative data values into groups to help show that certain areas fall within a similar range of values. For instance, a mapmaker may divide counties into groups of high, middle, and low life expectancy (measured in years). It is well known that different binning methods (e.g., natural breaks, quantile) yield different groupings, meaning the same data can be presented differently depending on how it is divided into bins. To help guide a wide variety of users, we present a new, open source, web-based, geospatial visualization tool, Exploropleth, that lets users interact with a catalog of established data binning methods, and subsequently compare, customize, and export custom maps. This tool advances the state of the art by providing multiple binning methods in one view and supporting administrative unit reclassification on-the-fly. We interviewed 16 cartographers and geographic information systems (GIS) experts from 13 government organizations, NGOs, and federal agencies who identified opportunities to integrate Exploropleth into their existing mapmaking workflow, and found that the tool has potential to educate students as well as mapmakers with varying levels of experience. 

<br/>

## Key Features:
- **Browse** 15+ established data binning methods.
- **Compare** the bin breaks and sizes across binning methods.
- **Combine** bins of multiple methods into a new consensus method [Resiliency](https://github.com/exploropleth/resiliency-app).
- **Create** custom binning methods to suit custom requirements.
- **Export** custom maps in raster, vector formats.
- **Upload** own data - Coming Soon!

<br/>

## Authors
Exploropleth was created by
<a target="_blank" href="https://narechania.com">Arpit Narechania</a>, <a href="https://va.gatech.edu/endert/">Alex Endert</a>, and <a href="https://friendlycities.gatech.edu/">Clio Andris</a> of the <a target="_blank" href="https://vis.gatech.edu/">Georgia Tech Visualization Lab</a> and <a target="_blank" href="https://hkust.edu.hk">The Hong Kong University of Science and Technology</a>.</p>

<br/>

## Links
- [Project Homepage](https://exploropleth.github.io)
- [Live Demo](https://exploropleth.github.io/exploropleth)
- [Source Code (GitHub)](https://github.com/exploropleth/exploropleth)
- [Poster (Awardee at CRIDC'23)](https://narechania.com/docs/posters/exploropleth_cridc_2023.pdf)
- Journal Paper (CaGIS'2025)
- Paper Citation

  ```bibTeX
  @article{narechania2025exploropleth,
    author =	{Narechania, Arpit and Endert, Alex and Andris, Clio},
    title =	{{Exploropleth: Exploratory Analysis of Data Binning Methods in Choropleth Maps}},
    journal={{Cartography and Geographic Information Science}},
    year={2025}
  }
  ```

<br/>

## Setup
- Open the command line/terminal on your machine and navigate to this project's top-level directory (i.e. where this file is).
- Download and install node, npm from https://nodejs.org/en/download/. Optionally, use the <a href="https://github.com/nvm-sh/nvm" target="_blank">nvm (Node Version Manager)</a> to quickly install and use different versions of node via the command line.
- `npm install` - installs required libraries from package.json (including Angular CLI locally).

<br/>

## Run
- `npm start` or `ng serve` - compile and serve the application locally
- Open the browser at http://localhost:4200
- Enjoy!

<br/>

## Build
- `npm run build` (built files are in the `dist` folder)

<br/>

## Deployment
- via GitHub Pages and is setup via GitHub Actions (`.github/workflows/angular-gh-pages.yaml`)

<br/>

## Credits
We thank the members of the <a target="_blank" href="https://vis.gatech.edu/">Georgia Tech Visualization Lab</a> for their support and constructive feedback.

<br/>

## Related Projects and Citations

### How do Mapmakers Make Choropleth Maps? ([Paper](https://narechania.com/docs/publications/cartographers-in-cubicles_cscw_2025.pdf))
When creating choropleth maps, mapmakers often bin (i.e., group, classify) quantitative data values into groups to help show that certain areas fall within a similar range of values. For instance, a mapmaker may divide counties into groups of high, middle, and low life expectancy (measured in years). It is well known that different binning methods (e.g., natural breaks, quantile) yield different groupings, meaning the same data can be presented differently depending on how it is divided into bins. To help guide a wide variety of users, we present a new, open source, web-based, geospatial visualization tool, Exploropleth, that lets users interact with a catalog of established data binning methods, and subsequently compare, customize, and export custom maps. This tool advances the state of the art by providing multiple binning methods in one view and supporting administrative unit reclassification on-the-fly. We interviewed 16 cartographers and geographic information systems (GIS) experts from 13 government organizations, NGOs, and federal agencies who identified opportunities to integrate Exploropleth into their existing mapmaking workflow, and found that the tool has potential to educate students as well as mapmakers with varying levels of experience. Exploropleth is open-source and publicly available.

```bibTeX
@article{narechania2025cartographersincubicles,
    title = {{Cartographers in Cubicles: How Training and Preferences of Mapmakers Interplay with Structures and Norms in Not-for-Profit Organizations}},
    shorttitle = {{Cartographers in Cubicles}},
    author = {Narechania, Arpit and Endert, Alex and Andris, Clio},
    journal = {ACM CSCW},
    year = {2025},
    publisher = {ACM}
}
```

<br/>

### Resiliency: A Consensus Data-Binning Method ([GitHub](https://github.com/exploropleth/binguru/blob/ac5c1a14969e6f8af9236d0dd3d290c17607f7b9/src/index.ts#L890), [Paper](https://narechania.com/docs/publications/resiliency_giscience_2023.pdf))
Data binning, or data classification, involves grouping quantitative data points into bins (or classes) to represent spatial patterns and show variation in choropleth maps. There are many methods for binning data (e.g., natural breaks, quantile) that may make the same data appear very different on a map. Some of these methods may be more or less appropriate for certain types of data distributions and map purposes. Thus, when designing a map, novice users may be overwhelmed by the number of choices for binning methods and experts may find comparing results from different binning methods challenging. We present resiliency, a new data binning method that assigns areal units to their most agreed-upon, consensus bin as it persists across multiple chosen binning methods. We show how this "smart average" can effectively communicate spatial patterns that are agreed-upon across binning methods. We also measure the variety of bins a single areal unit can be placed in under different binning methods showing fuzziness and uncertainty on a map. Resiliency is available in an open-source JavaScript library, BinGuru, described next.

```bibTeX
@article{narechania2023resiliency,
    title={{Resiliency: A Consensus Data Binning Method}},
    author={Narechania, Arpit and Endert, Alex and Andris, Clio},
    journal={12th International Conference on Geographic Information Science (GIScience)},
    year={{2023}},
    publisher={Leibniz International Proceedings in Informatics},
    url={https://doi.org/10.4230/LIPIcs.GIScience.2023.55}
}
```
<br/>

### BinGuru ([GitHub](https://github.com/exploropleth/binguru), [Observable Demo](https://observablehq.com/@arpitnarechania/binguru-demo))
BinGuru is a JavaScript package with an API to several established data binning / data classification methods (including Resiliency) that are often used for visualizing data on choropleth maps. Currently supported methods include:

- Equal Interval
- Percentile
- Defined Interval
- Quantile
- Boxplot
- Standard Deviation
- Maximum Breaks
- Pretty Breaks
- CK-Means
- Head Tail Breaks
- Fisher-Jenks
- Exponential Bin ize
- Geometric Interval
- Unclassed
- Unique
- Manual Interval
- Resiliency

<br/>

## License
The software is available under the [MIT License](https://github.com/exploropleth/exploropleth/blob/master/LICENSE).

<br/>

## Contact
If you have any questions, feel free to [open an issue](https://github.com/exploropleth/exploropleth/issues/new/choose) or contact [Arpit Narechania](https://narechania.com).