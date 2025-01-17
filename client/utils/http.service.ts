import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";


export type QueryParams = {
	[param: string]: string | number | boolean
};


@Injectable({providedIn: "root"})
export class HttpService {
	constructor(protected http: HttpClient) {}
	
	get<T>(url: string, queryParams?: QueryParams): Observable<T> {
		return this.http.get<T>(url, { params: queryParams || {} });
	}
	
	postJson<Req, Res>(url: string, body: Req): Observable<Res> {
		const headers: HttpHeaders = new HttpHeaders().set("Content-Type", "application/json");
		return this.http.post<Res>(url, JSON.stringify(body), { headers: headers });
	}
}
