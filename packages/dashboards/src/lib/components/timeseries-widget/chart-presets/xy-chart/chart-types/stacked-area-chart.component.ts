import { ChangeDetectorRef, Component, Inject, Optional } from "@angular/core";
import { EventBus, IDataSource, IEvent } from "@nova-ui/bits";
import {
    areaGrid,
    AreaRenderer,
    Chart,
    ChartAssist,
    ChartPalette,
    IAccessors,
    IValueProvider,
    stackedArea,
    stackedAreaAccessors,
} from "@nova-ui/charts";

import { DATA_SOURCE, PIZZAGNA_EVENT_BUS } from "../../../../../types";
import { TimeseriesScalesService } from "../../../timeseries-scales.service";
import { XYChartComponent } from "../xy-chart.component";

@Component({
    selector: "nui-stacked-area-chart",
    templateUrl: "../xy-chart.component.html",
    styleUrls: ["../xy-chart.component.less"],
})
export class StackedAreaChartComponent extends XYChartComponent {
    public static lateLoadKey = "StackedAreaChartComponent";

    constructor(@Inject(PIZZAGNA_EVENT_BUS) eventBus: EventBus<IEvent>,
                @Optional() @Inject(DATA_SOURCE) dataSource: IDataSource,
                                            timeseriesScalesService: TimeseriesScalesService,
                                            changeDetector: ChangeDetectorRef) {
        super(eventBus, dataSource, timeseriesScalesService, changeDetector);

        this.renderer = new AreaRenderer();
        this.valueAccessorKey = "y1";
    }

    protected createAccessors(colorProvider: IValueProvider<string>): IAccessors {
        return stackedAreaAccessors(colorProvider);
    }

    protected createChartAssist(palette: ChartPalette): ChartAssist {
        const grid = areaGrid();
        grid.config().axis.left.fit = true;
        const chart = new Chart(grid);
        return new ChartAssist(chart, stackedArea, palette);
    }

}
