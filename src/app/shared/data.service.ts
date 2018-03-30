import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/toPromise';


@Injectable()
export class DataService {
  private _rootpath = "/api/"
  constructor(private _http: Http) { }
  GetPostMethod(url, params) {
    return this._http.get(this._rootpath + url).map((data: Response) => data.json());
  }
  postmethod(url, params) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const options = new RequestOptions({ headers: headers });
    return this._http.post(this._rootpath + url, JSON.stringify(params), options)
      .map((data: Response) => data.json())

  }
  private handleError(error: Response) {
    console.error(error);
    return Observable.throw(error.json().error || 'Server error');
  }

}
