import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { webSocket, WebSocketSubject, WebSocketSubjectConfig } from "rxjs/webSocket";

import { SERVER_URL } from "../app/flags.js";


export type QueryParams = {
	[param: string]: string | number | boolean
};


@Injectable({providedIn: "root"})
export class BackendService {
	constructor(
		private readonly httpClient: HttpClient,
		@Inject(SERVER_URL) private readonly url: string) {}
	
	public get<T>(path: string, queryParams?: QueryParams): Observable<T> {
		return this.httpClient.get<T>(this.httpUrl(path), { params: queryParams || {} });
	}
	
	public postJson<Req, Res>(path: string, body: Req): Observable<Res> {
		const headers: HttpHeaders = new HttpHeaders().set("Content-Type", "application/json");
		return this.httpClient.post<Res>(this.httpUrl(path), JSON.stringify(body), { headers: headers });
	}
	
	public webSocket<T>(config: WebSocketSubjectConfig<T>) : WebSocketSubject<T> {
		return webSocket({ ...config, url: this.wsUrl(config.url) });
	}
	
	private httpUrl(path: string): string {
		return this.http() + this.url + path;
	}
	
	private wsUrl(path: string): string {
		return this.ws() + this.url + path;
	}
	
	private http(): string {
		return this.isSecure() ? "https://" : "http://";
	}
	
	private ws(): string {
		return this.isSecure() ? "wss://" : "ws://";
	}
	
	private isSecure(): boolean {
		return window.location.protocol === "https:";
	}
}
