import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
console.log('Routing module loaded');

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./modules/candidates/candidates.module').then(m => m.CandidatesModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
