import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-uploadcsv',
  templateUrl: './uploadcsv.component.html',
  styleUrls: ['./uploadcsv.component.css']
})
export class UploadcsvComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }
  public Myarray: any = [
    { "name": "jithender", "id": 0 },
    { "name": "Raj", "id": 1 }
  ]

}
