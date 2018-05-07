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
export class AuthService {

  constructor(private http: Http, private router: Router) { }
  public currentUser;
  isLoggedIn(): boolean {
    try {
      const theUser: any = true;
      if (theUser) {
        this.currentUser = theUser;
      }
    } catch (e) {
      return false;
    }

    return !!this.currentUser;
  }
  login(oUser) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const options = new RequestOptions({ headers: headers });

    return this.http.post('http://localhost:145/api/login', JSON.stringify(oUser), options)
      .do((response: Response) => {
        if (response.json().success) {
          const userObj: any = {};
        }
      })
      .catch(this.handleError);
  }
  private handleError(error: Response) {
    console.error(error);
    return Observable.throw(error.json().error || 'Server error');
  }

}
