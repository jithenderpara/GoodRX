import { Component, OnInit } from '@angular/core';
import { ChatService } from '../chat.service';

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css'],
  providers: [ChatService]
})
export class MessageComponent implements OnInit {

  constructor(private chatService: ChatService) { }
  msg: string;
  _messages: any = [];
  public users:any=[];
  public loginuser:string;
  public showlogin: boolean = true;
  ngOnInit() {
    this.getusermessage();
    this.getAllUsers();
    this.getusermessage();
  }
  getAllUsers() {
    this.chatService
      .GetloginUsers()
      .subscribe(
      data => {
        this.users = data;
        console.log(this.users);
      })
  }
  getusermessage() {
    this.chatService
      .getMessage()
      .subscribe(
      data => {
        console.log(JSON.stringify(data) + 'msg from socket');
        this._messages.push(data)
      })

  }
  sendMsgToUser(msg, username) {
    let sendObj = { name: 'jithu', message: msg };
    this.chatService.sendMessage(sendObj);

  }
  public chatname: any;
  public chatonline: any;
  public showchatbox: boolean = false;
  openChat(name) {
    this.chatname = name;
    this.chatonline = "Online";
    this.showchatbox = true;
  }
}
