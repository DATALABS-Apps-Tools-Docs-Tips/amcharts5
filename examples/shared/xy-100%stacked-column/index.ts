import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const root = am5.Root.new("chartdiv");

root.setThemes([
  am5themes_Animated.new(root)
]);

const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: "panX", wheelY: "zoomX" }));
chart.set("scrollbarX", am5.Scrollbar.new(root, { orientation: "horizontal" }));

chart.set("layout", root.verticalLayout);
const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50 }))

const data = [{
  "year": "2021",
  "europe": 2.5,
  "namerica": 2.5,
  "asia": 2.1,
  "lamerica": 0.3,
  "meast": 0.2,
  "africa": 0.1
}, {
  "year": "2022",
  "europe": 2.6,
  "namerica": 2.7,
  "asia": 2.2,
  "lamerica": 0.3,
  "meast": 0.3,
  "africa": 0.1
}, {
  "year": "2023",
  "europe": 2.8,
  "namerica": 2.9,
  "asia": 2.4,
  "lamerica": 0.3,
  "meast": 0.3,
  "africa": 0.1
}]


const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: "year", renderer: am5xy.AxisRendererX.new(root, {}) }));
const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min:0, renderer: am5xy.AxisRendererY.new(root, {}) }));

xAxis.set("tooltip", am5.Tooltip.new(root, { themeTags: ["axis"], animationDuration: 200 }))
xAxis.data.setAll(data);

function makeSeries(name: string, fieldName: string) {
  const series = chart.series.push(am5xy.ColumnSeries.new(root, { name: name, stacked: true, sequencedInterpolation: true, xAxis: xAxis, yAxis: yAxis, valueYField: fieldName, categoryXField: "year" }));

  series.columns.template.setAll({tooltipText: "{name}, {categoryX}:{valueY}", tooltipY:am5.percent(10)});
  series.data.setAll(data);
  series.appear();

  series.bullets.push(() => {
    return am5.Bullet.new(root, { sprite: am5.Label.new(root, { text: "{valueY}", fill: root.interfaceColors.get("alternativeText"), centerY: am5.p50, centerX: am5.p50, populateText: true }) });
  })

  legend.data.push(series);
}

makeSeries("Europe", "europe");
makeSeries("North America", "namerica");
makeSeries("Asia", "asia");
makeSeries("Latin America", "lamerica");
makeSeries("Middle East", "meast");
makeSeries("Africa", "africa");


chart.appear();