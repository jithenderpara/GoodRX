import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormBuilder,Validators } from '@angular/forms';
@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
uploadForm = new FormGroup ({
    name: new FormControl()
  });
  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.uploadForm = this.fb.group({
     name: ['', Validators.required ], 
    });
  }

}
