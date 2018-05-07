import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import { Socket } from 'ngx-socket-io';

@Injectable()
export class ChatService {

  constructor(private socket: Socket) { }
  getMessage() {
    return this.socket
      .fromEvent('msg')
      .map(data => data);
  }
  sendMessage(msg: any) {
    debugger
    this.socket
      .emit('private message', msg);
  }
  CreateUser(user: any) {
    this.socket
      .emit('new user', user);
  }
  GetloginUsers() {
    return this.socket
      .fromEvent('usernames')
      .map(data => data);
  }
}

