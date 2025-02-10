import { Type } from "@angular/core";
import { Data, MaybeAsync, Params, RedirectCommand, Resolve, Route, RouterStateSnapshot } from "@angular/router";
import { TypedRoute as TypedActivatedRoute, TypedRouteSnapshot as TypedActivatedRouteSnapshot } from "ngx-typed-router";


type IsUnion<T, U = T> = T extends T ? [U] extends [T] ? false : true : never;
type StringLiteral<S extends string> = string extends S ? never : IsUnion<S> extends false ? S : never;
export type StringLiterals<S extends string[]> = { [I in keyof S]: StringLiteral<S[I]> };


// Defined our own ResolveFn that supports ActivatedRoutes.
export type ResolveFn<T, D extends Data = {}, P extends Params = {}, Q extends Params = {}> =
	(route: TypedActivatedRouteSnapshot<D, P, Q>, state: RouterStateSnapshot) => MaybeAsync<T | RedirectCommand>;

	
// ResolveConfig from ngs-typed-router does not support ResolveFn, so we use
// our own instead.
type ResolveConfig<D extends Data, P extends Params, Q extends Params> = {
	[K in keyof D]: ResolveFn<D[K], D, P, Q> | {
		new(...args: any[]): Resolve<D[K]>;
	};
};


type TypedRoute<D extends Data, P extends Params, Q extends Params> = Route & {
	title: string,
	path: string,
	component: Type<any>,
	resolve?: ResolveConfig<D, P, Q>
};


export class AppRoute<D extends Data = {}, P extends Params = {}, Q extends Params = {}> {
	private readonly components: string[];
	
	constructor(public readonly route: TypedRoute<D, P, Q>) {
		this.components = this.route.path.split("/");
	}
	
	public url(params: P): string[] {
		return this.components.map(component => {
			if (component.startsWith(":")) {
				return params[component.substring(1)];
			} else {
				return component;
			}
		});
	}
}


export class AppRouteNoParams<D extends Data = {}> extends AppRoute<D> {
	public override url(_: {} = {}): string[] {
		return super.url({});
	}
}


export type TypedRouteFor<R> =
	R extends AppRoute<infer D, infer P, infer Q> ? TypedActivatedRoute<D, P, Q> : never;
