import { ListRange } from "@angular/cdk/collections";
import { Injectable } from "@angular/core";
import { DataSourceService, IDataField, INovaFilteringOutputs, INovaFilters, ISorterFilter, LoggerService } from "@nova-ui/bits";
import isEqual from "lodash/isEqual";
import orderBy from "lodash/orderBy";
import { BehaviorSubject } from "rxjs";

import { IRandomUserResponse, IRandomUserResults, IRandomUserTableModel, UsersQueryResponse } from "../types";

import { apiRoute, corsProxy, RANDOMUSER_API_URL, responseError } from "./constants";

@Injectable()
export class RandomUserDataSource extends DataSourceService<IRandomUserTableModel> {
    public static providerId = "RandomUserDataSource";

    private readonly seed = "sw";

    private cache = Array.from<IRandomUserTableModel>({length: 0});
    private lastSortValue?: ISorterFilter;
    private lastVirtualScroll?: ListRange;

    public page: number = 1;
    public busy = new BehaviorSubject(false);

    public dataFields: Array<IDataField> = [
        {id: "no", label: $localize`No`, dataType: "number"},
        {id: "nameTitle", label: $localize`Title`, dataType: "string"},
        {id: "nameFirst", label: $localize`First`, dataType: "string"},
        {id: "nameLast", label: $localize`Last`, dataType: "string"},
        {id: "gender", label: $localize`Gender`, dataType: "string"},
        {id: "country", label: $localize`Country`, dataType: "string"},
        {id: "city", label: $localize`City`, dataType: "string"},
        {id: "postcode", label: $localize`Postcode`, dataType: "number"},
        {id: "email", label: $localize`E-Mail`, dataType: "string"},
        {id: "cell", label: $localize`Cell`, dataType: "string"},
    ];

    constructor(private logger: LoggerService) {
        super();
    }

    public async getFilteredData(filters: INovaFilters): Promise<INovaFilteringOutputs> {
        // This condition handles sorting. We want to sort columns without fetching another chunk of data.
        // Since the data is being fetched when scrolled, we compare virtual scroll indexes here in the condition as well.
        if (filters.sorter?.value) {
            if (!isEqual(this.lastSortValue, filters.sorter.value) && isEqual(this.lastVirtualScroll, filters.virtualScroll?.value)) {
                this.lastSortValue = filters.sorter?.value;
                this.lastVirtualScroll = filters.virtualScroll?.value;

                return {
                    repeat: {itemsSource: this.sortData(this.cache, filters)},
                    paginator: {total: 200},
                    dataFields: this.dataFields,
                };
            }
        }
        this.busy.next(true);

        const virtualScrollFilter = filters.virtualScroll && filters.virtualScroll.value;
        const start = virtualScrollFilter ? filters.virtualScroll?.value.start : 0;
        const end = virtualScrollFilter ? filters.virtualScroll?.value.end : 0;

        // We're returning Promise with setTimeout here to make the response from the server longer, as the API being used sends responses
        // almost immediately. We need it longer to be able the show the spinner component on data load
        return new Promise(resolve => {
            setTimeout(() => {
                this.getData(start, end).then((response: INovaFilteringOutputs | undefined) => {
                    if (!response) {
                        return;
                    }

                    this.cache = this.cache.concat(response.users);

                    this.dataSubject.next(this.cache);
                    resolve({
                        repeat: {itemsSource: this.sortData(this.cache, filters)},
                        // This API can return thousands of results, however doesn't return the max number of results,
                        // so we set the max number of result manually here.
                        paginator: {total: 200},
                        dataFields: this.dataFields,
                    });

                    this.lastSortValue = filters.sorter?.value;
                    this.lastVirtualScroll = filters.virtualScroll?.value;
                    this.busy.next(false);
                });
            }, 300);
        });
    }

    public async getData(start: number = 0, end: number = 20): Promise<INovaFilteringOutputs | undefined> {
        let response: IRandomUserResponse | null = null;
        try {
            response = await
            (await fetch(`${corsProxy}/${RANDOMUSER_API_URL}/${apiRoute}/?page=${this.page}&results=${end - start}&seed=${this.seed}`)).json();
            return {
                users: response?.results.map((result: IRandomUserResults, i: number) => ({
                    no: this.cache.length + i + 1,
                    nameTitle: result.name.title,
                    nameFirst: result.name.first,
                    nameLast: result.name.last,
                    gender: result.gender,
                    country: result.location.country,
                    city: result.location.city,
                    postcode: result.location.postcode,
                    email: result.email,
                    cell: result.cell,
                })),
                total: response?.results.length,
                start: start,
            } as UsersQueryResponse;
        } catch (e) {
            this.logger.error(responseError);
        }
    }

    private sortData(data: IRandomUserTableModel[], filters: INovaFilters) {
        return orderBy(data, filters.sorter?.value?.sortBy, filters.sorter?.value?.direction as "desc" | "asc");
    }
}
