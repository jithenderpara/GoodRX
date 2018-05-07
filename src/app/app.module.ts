import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { HeaderComponent } from './common/header/header.component';
import { UploadcsvModule } from './core/uploadcsv/uploadcsv.module';
import { UploadComponent } from './core/upload/upload.component';
import {HttpModule} from '@angular/http';
import { DataService } from './shared/data.service';
import { ChatService } from './shared/chat.service';
import { ReactiveFormsModule } from '@angular/forms';
import { SchedulejobComponent } from './core/schedulejob/schedulejob.component';
import { MessageComponent } from './shared/message/message.component';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { LoginComponent } from './common/login/login.component';
import { AuthGuard } from './shared/auth-guard.service';
import { AuthService } from './shared/auth.service';

const Route = [
  { path: 'login', component: LoginComponent },
  { path: 'upload', component: UploadComponent, canActivate: [AuthGuard] },
  { path: 'job', component: SchedulejobComponent, canActivate: [AuthGuard] }
]
@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    UploadComponent,
    SchedulejobComponent,
    MessageComponent,
    LoginComponent,
  ],
  imports: [
    BrowserModule,
    UploadcsvModule,
  ReactiveFormsModule,
    HttpModule,
    RouterModule.forRoot(Route)
  ],
  providers: [
    DataService,
    ChatService,
    AuthService,
    AuthGuard],
  bootstrap: [AppComponent]
})
export class AppModule { }
