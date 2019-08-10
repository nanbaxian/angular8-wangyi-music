import {Component, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {SongService} from 'src/app/service/song/song.service';
import {Song, SongSheet} from 'src/app/service/data-modals/common.models';
import { map } from 'rxjs/operators';
import { MultipleReducersService } from 'src/app/store/multiple-reducers.service';
import {Observable, Subject} from "rxjs/index";
import {AppStoreModule} from "../../store/index";
import {select, Store} from "@ngrx/store";
import {takeUntil} from "rxjs/internal/operators";
import {getCurrentSong} from "../../store/selectors/player.selector";
import {findIndex} from "../../utils/array";
import { SheetService } from '../../service/sheet/sheet.service';
import { MemberService } from '../../service/member/member.service';
import { NzMessageService } from 'ng-zorro-antd';

@Component({
  selector: 'app-sheet-info',
  templateUrl: './sheet-info.component.html',
  styleUrls: ['./sheet-info.component.less']
})
export class SheetInfoComponent implements OnDestroy{
  sheetInfo: SongSheet;
  description = {
    short: '',
    long: ''
  }

  controlDesc = {
    isExpand: false,
    label: '展开',
    iconCls: 'down'
  }
  
  currentIndex = -1;
  private currentSong: Song;
  
  private appStore$: Observable<AppStoreModule>;
  private destroy$ = new Subject<void>();
  
  constructor(
    private route: ActivatedRoute,
    private songServe: SongService,
    private sheetServe: SheetService,
    private memberServe: MemberService,
    private messageServe: NzMessageService,
    private multipleReducerServe: MultipleReducersService,
    private store$: Store<AppStoreModule>
  ) {
    this.route.data.pipe(map(res => res.sheetInfo)).subscribe(res => {
      // console.log('sheetInfo :', res);
      this.sheetInfo = res;
      
      if (res.description) {
        this.changeDesc(res.description);
      }
      
      this.listenCurrentSong();
    });
  }
  
  // 监听currentSong
  private listenCurrentSong() {
    this.appStore$ = this.store$.pipe(select('player'), takeUntil(this.destroy$));
    this.appStore$.pipe(select(getCurrentSong)).subscribe(song => {
      // console.log('listenCurrentSong :', song);
      this.currentSong = song;
      if (song) {
        this.currentIndex = findIndex(this.sheetInfo.tracks, song);
      }else{
        this.currentIndex = -1;
      }
    });
  }


  playSong(id: number) {
    this.sheetServe.getSongSheetDetail(id).subscribe(sheet => {
      this.songServe.getSongList(sheet.tracks).subscribe(list => {
        if (list.length) {
          this.multipleReducerServe.selectPlay(({ list, index: 0 }));
        }
      });
    });
  }
  
  // 添加一首歌曲
  onAddSong(song: Song, play = false) {
    if (this.currentSong && this.currentSong.id === song.id) {
      console.log('存在');
    }else{
      this.songServe.getSongList(song).subscribe(list => this.multipleReducerServe.insertSong(list[0], play));
    }
  }
  
  // 添加歌单
  onAddSongs(songs: Song[]) {
    this.songServe.getSongList(songs).subscribe(list => {
      this.multipleReducerServe.insertSongs(list);
    });
  }

  // 控制简介的展开和隐藏
  toggleDesc() {
    this.controlDesc.isExpand = !this.controlDesc.isExpand;
    if (this.controlDesc.isExpand) {
      this.controlDesc.label = '收起';
      this.controlDesc.iconCls = 'up';
    } else {
      this.controlDesc.label = '展开';
      this.controlDesc.iconCls = 'down';
    }
  }

  private changeDesc(desc: string) {
    if (desc.length < 99) {
      this.description.short = '<b>介绍：</b>' + desc;
    }else{
      const str = '<b>介绍：</b>' + desc.replace(/\n/g, '<br />');
      this.description.short = str.slice(0, 99) + '...';
      this.description.long = str;
    }
  }
  

  // 收藏歌曲
  onLikeSong(id: number) {
    this.multipleReducerServe.likeSheet(id);
  }

  // 收藏歌单
  onLikeSheet(id: number) {
    this.memberServe.likeSheet(id).subscribe(code => {
      if (code === 200) {
        this.alertMessage('success', '收藏成功');
      }else{
        this.alertMessage('error', '收藏失败');
      }
    }, error => this.alertMessage('error', '收藏失败'));
  }

  private alertMessage(type: string, msg: string) {
    this.messageServe.create(type, msg);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
