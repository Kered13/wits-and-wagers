import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { webSocket, WebSocketSubject } from "rxjs/webSocket";

import { SERVER_URL } from "../app/flags.js";


export type QueryParams = {
	[param: string]: string | number | boolean
};


@Injectable({providedIn: "root"})
export class BackendService {
	constructor(
		private readonly http: HttpClient,
		@Inject(SERVER_URL) private readonly url: string) {}
	
	public get<T>(path: string, queryParams?: QueryParams): Observable<T> {
		return this.http.get<T>(this.httpUrl(path), { params: queryParams || {} });
	}
	
	public postJson<Req, Res>(path: string, body: Req): Observable<Res> {
		const headers: HttpHeaders = new HttpHeaders().set("Content-Type", "application/json");
		return this.http.post<Res>(this.httpUrl(path), JSON.stringify(body), { headers: headers });
	}
	
	public webSocket<T>(path: string) : WebSocketSubject<T> {
		return webSocket(this.wsUrl(path));
	}
	
	private httpUrl(path: string): string {
		return (this.isSecure() ? "https://" : "http://") + this.url + path;
	}
	
	private wsUrl(path: string): string {
		return (this.isSecure() ? "wss://" : "ws://") + this.url + path;
	}
	
	private isSecure(): boolean {
		return window.location.protocol === "https";
	}
}
