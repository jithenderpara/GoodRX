import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DataService } from '../../shared/data.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  constructor(private fb: FormBuilder, private router: Router, private dataService: DataService) {
    this.loginForm = fb.group({
      'emailid': [null, Validators.required],
      'password': [null, Validators.required]
    });

  }
  ngOnInit() {
  }
  loginSubmit(value) {
    this.dataService.postmethod('login', value)
      .subscribe(response => {
        if (response.status) {
          this.router.navigate(['upload']);
          // alert(response.msg);
        }
        else{
          alert(response.msg)
        }
      });

  }

}
