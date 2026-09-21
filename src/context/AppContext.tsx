import React,{createContext,useContext,useEffect,useMemo,useState}from'react';
import{INITIAL_ACCOUNTS,INITIAL_BRANDS,INITIAL_CONTENT}from'../data/initialData';
import{auth,collection,db,deleteDoc,doc,googleProvider,getDocs,onAuthStateChanged,onSnapshot,query,setDoc,signInAnonymously,signInWithPopup,where,fbSignOut}from'../services/firebase';
import{publisherService}from'../services/publisher/PublisherService';
import{Brand,ContentItem,GlobalPublishStatus,Platform,PlatformPublishStatus,PublishingEvent,PublishingJob,SocialAccount,UserProfile}from'../types';

interface AppContextType{
  user:UserProfile|null;authLoading:boolean;signInGoogle:()=>Promise<void>;signOut:()=>Promise<void>;loginAsDemoOperator:()=>void;
  brands:Brand[];selectedBrandId:string;setSelectedBrandId:(id:string)=>void;createBrand:(data:{name:string;code:string;description?:string;color:string})=>Promise<Brand>;
  accounts:SocialAccount[];addSocialAccount:(data:Omit<SocialAccount,'id'>)=>Promise<SocialAccount>;
  contentList:ContentItem[];selectedContentItem:ContentItem|null;setSelectedContentItem:(item:ContentItem|null)=>void;
  createContent:(data:{brandId:string;title:string;videoUrl:string;mediaStorageKey?:string;caption:string;platforms:Platform[];scheduledAt?:string|null},postNow?:boolean)=>Promise<ContentItem>;
  updateContent:(id:string,updates:Partial<ContentItem>)=>Promise<void>;deleteContent:(id:string)=>Promise<void>;scheduleContent:(id:string,scheduledDate:string)=>Promise<void>;publishNow:(id:string,specificPlatforms?:Platform[])=>Promise<void>;retryPublish:(id:string,platform?:Platform)=>Promise<void>;
  jobs:PublishingJob[];events:PublishingEvent[];publisherMode:'mock'|'autosocial';setPublisherMode:(mode:'mock'|'autosocial')=>void;isFailureSimulated:(platform:Platform)=>boolean;toggleSimulatedFailure:(platform:Platform)=>void;
  importCsvBatch:(rows:Array<{brand:string;title:string;video_url:string;caption:string;instagram?:boolean;tiktok?:boolean;youtube?:boolean;scheduled_at?:string}>)=>Promise<{imported:number;errors:string[]}>;
}

const Ctx=createContext<AppContextType|undefined>(undefined);
const ORG='org_nahalabs_hq';
const LS={brands:'nahalabs_brands_v1',accounts:'nahalabs_accounts_v1',content:'nahalabs_content_v1',jobs:'nahalabs_jobs_v1',events:'nahalabs_events_v1'};
const DEMO:UserProfile={uid:'demo-local',email:'naha.thabiso@gmail.com',displayName:'Thabiso Naha',role:'admin',organizationId:ORG,avatarUrl:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'};
const now=()=>new Date().toISOString();

const globalStatus=(ps:Record<Platform,PlatformPublishStatus>,platforms:Platform[],current:GlobalPublishStatus='DRAFT'):GlobalPublishStatus=>{
  const s=platforms.map(p=>ps[p]);
  if(!s.length)return current;
  if(s.every(x=>x==='PUBLISHED'))return'PUBLISHED';
  if(s.some(x=>x==='RETRY_PENDING'))return'RETRY_PENDING';
  if(s.some(x=>['CLAIMED','STAGED','PUBLISHING'].includes(x)))return'PUBLISHING';
  if(s.some(x=>x==='QUEUED'))return'QUEUED';
  if(s.every(x=>x==='FAILED_PERMANENT'))return'FAILED_PERMANENT';
  if(s.every(x=>['FAILED','FAILED_PERMANENT'].includes(x)))return'FAILED';
  if(s.some(x=>x==='PUBLISHED'))return'PARTIAL';
  return current;
};

const orgify=(v:any)=>({...v,organizationId:ORG});

export const AppProvider:React.FC<{children:React.ReactNode}>=({children})=>{
  const[user,setUser]=useState<UserProfile|null>(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[cloudReady,setCloudReady]=useState(false);
  const[brands,setBrands]=useState<Brand[]>(INITIAL_BRANDS);
  const[accounts,setAccounts]=useState<SocialAccount[]>(INITIAL_ACCOUNTS);
  const[contentList,setContentList]=useState<ContentItem[]>(INITIAL_CONTENT);
  const[jobs,setJobs]=useState<PublishingJob[]>([]);
  const[events,setEvents]=useState<PublishingEvent[]>([]);
  const[selectedBrandId,setSelectedBrandId]=useState('ALL');
  const[selectedContentItem,setSelectedContentItem]=useState<ContentItem|null>(null);
  const[publisherMode,setPublisherModeState]=useState<'mock'|'autosocial'>('mock');
  const[simulatedFailures,setSimulatedFailures]=useState<Record<Platform,boolean>>({instagram:false,tiktok:false,youtube:false});

  useEffect(()=>onAuthStateChanged(auth,u=>{
    setAuthLoading(false);
    setCloudReady(false);
    if(!u){setUser(null);return}
    setUser({
      uid:u.uid,
      email:u.email||'',
      displayName:u.displayName||(u.isAnonymous?'NahaLabs Demo Operator':'NahaLabs Operator'),
      role:'admin',
      organizationId:ORG,
      avatarUrl:u.photoURL||undefined
    });
  }),[]);

  useEffect(()=>{
    if(!user)return;
    let dead=false;
    (async()=>{
      try{
        await setDoc(doc(db,'users',user.uid),{...user,updatedAt:now()},{merge:true});
        await setDoc(doc(db,'organizations',ORG),{id:ORG,name:'NahaLabs HQ',slug:'nahalabs-hq',createdBy:user.uid,updatedAt:now()},{merge:true});

        const key='nahalabs_cloud_migrated_v4_'+user.uid;
        if(!localStorage.getItem(key)){
          for(const[name,lsKey]of Object.entries(LS)){
            const snap=await getDocs(query(collection(db,name),where('organizationId','==',ORG)));
            if(!snap.empty)continue;
            const raw=localStorage.getItem(lsKey);
            if(!raw)continue;
            const values=JSON.parse(raw);
            if(Array.isArray(values)){
              await Promise.all(values.filter(v=>v?.id).map(v=>setDoc(doc(db,name,v.id),orgify(v),{merge:true})));
            }
          }

          if(user.displayName.includes('Demo')){
            const bs=await getDocs(query(collection(db,'brands'),where('organizationId','==',ORG)));
            if(bs.empty)await Promise.all(INITIAL_BRANDS.map(v=>setDoc(doc(db,'brands',v.id),orgify(v),{merge:true})));

            const as=await getDocs(query(collection(db,'social_accounts'),where('organizationId','==',ORG)));
            if(as.empty)await Promise.all(INITIAL_ACCOUNTS.map(v=>setDoc(doc(db,'social_accounts',v.id),orgify(v),{merge:true})));
          }

          localStorage.setItem(key,'1');
        }
      }catch(e){
        console.warn('Cloud workspace initialisation failed; local fallback remains available.',e);
      }finally{
        if(!dead)setCloudReady(true);
      }
    })();
    return()=>{dead=true};
  },[user?.uid,user?.organizationId]);

  useEffect(()=>{
    if(!cloudReady||!user)return;
    const org=user.organizationId;
    const unsubs=[
      onSnapshot(query(collection(db,'brands'),where('organizationId','==',org)),s=>setBrands(s.docs.map(d=>d.data()as Brand).sort((a,b)=>a.name.localeCompare(b.name)))),
      onSnapshot(query(collection(db,'social_accounts'),where('organizationId','==',org)),s=>setAccounts(s.docs.map(d=>d.data()as SocialAccount).sort((a,b)=>a.handle.localeCompare(b.handle)))),
      onSnapshot(query(collection(db,'content'),where('organizationId','==',org)),s=>setContentList(s.docs.map(d=>d.data()as ContentItem).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))),
      onSnapshot(query(collection(db,'publishing_jobs'),where('organizationId','==',org)),s=>setJobs(s.docs.map(d=>d.data()as PublishingJob).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))),
      onSnapshot(query(collection(db,'publishing_events'),where('organizationId','==',org)),s=>setEvents(s.docs.map(d=>d.data()as PublishingEvent).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,200))),
    ];
    return()=>unsubs.forEach(u=>u());
  },[cloudReady,user?.organizationId]);

  useEffect(()=>{
    if(!cloudReady){
      localStorage.setItem(LS.brands,JSON.stringify(brands));
      localStorage.setItem(LS.accounts,JSON.stringify(accounts));
      localStorage.setItem(LS.content,JSON.stringify(contentList));
      localStorage.setItem(LS.jobs,JSON.stringify(jobs));
      localStorage.setItem(LS.events,JSON.stringify(events));
    }
  },[cloudReady,brands,accounts,contentList,jobs,events]);

  const persist=async(c:string,id:string,v:any)=>{
    if(cloudReady)await setDoc(doc(db,c,id),v,{merge:true});
  };

  const setPublisherMode=(mode:'mock'|'autosocial')=>{
    setPublisherModeState(mode);
    publisherService.setAdapterType(mode);
  };

  const isFailureSimulated=(p:Platform)=>!!simulatedFailures[p];
  const toggleSimulatedFailure=(p:Platform)=>{
    const v=!simulatedFailures[p];
    setSimulatedFailures(x=>({...x,[p]:v}));
    publisherService.getMockAdapter().setSimulateFailure(p,v);
  };

  const createBrand=async(data:{name:string;code:string;description?:string;color:string})=>{
    const b:Brand={
      id:'brand_'+data.code.toLowerCase()+'_'+Date.now().toString(36),
      organizationId:ORG,
      name:data.name.trim(),
      code:data.code.trim().toUpperCase(),
      description:data.description?.trim(),
      color:data.color||'#E65100',
      createdAt:now(),
      accountsCount:0
    };
    if(cloudReady)await persist('brands',b.id,b);else setBrands(x=>[b,...x]);
    return b;
  };

  const addSocialAccount=async(data:Omit<SocialAccount,'id'>)=>{
    const a:SocialAccount={
      ...data,
      id:'acc_'+data.platform+'_'+Date.now().toString(36),
      organizationId:ORG,
      lastActivityAt:now()
    };
    if(cloudReady)await persist('social_accounts',a.id,a);else setAccounts(x=>[a,...x]);
    return a;
  };

  const writeJob=async(j:PublishingJob)=>{
    if(cloudReady)await persist('publishing_jobs',j.id,j);
    else setJobs(x=>[j,...x.filter(y=>y.id!==j.id)]);
  };

  const writeEvent=async(e:Omit<PublishingEvent,'id'>)=>{
    const v:PublishingEvent={
      ...e,
      id:'evt_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),
      organizationId:ORG
    };
    if(cloudReady)await setDoc(doc(db,'publishing_events',v.id),v);
    else setEvents(x=>[v,...x].slice(0,200));
  };

  const updateContentRecord=async(id:string,updates:Partial<ContentItem>)=>{
    const v={...updates,updatedAt:now()};
    if(cloudReady)await persist('content',id,v);
    else setContentList(x=>x.map(i=>i.id===id?{...i,...v}:i));
  };

  const accountFor=(brandId:string,p:Platform)=>accounts.find(a=>a.brandId===brandId&&a.platform===p);

  const createJobs=async(item:ContentItem,platforms:Platform[],scheduledAt?:string|null)=>{
    const out:PublishingJob[]=[];
    for(const p of platforms){
      const a=accountFor(item.brandId,p);
      const t=now();
      const j:PublishingJob={
        id:'job_'+Date.now().toString(36)+'_'+p+'_'+Math.random().toString(36).slice(2,7),
        organizationId:ORG,
        contentId:item.id,
        brandId:item.brandId,
        platform:p,
        accountHandle:a?.handle||'',
        autoSocialAccountId:a?.autoSocialAccountId,
        status:'QUEUED',
        retryCount:0,
        scheduledAt:scheduledAt||null,
        readyAt:scheduledAt||t,
        createdAt:t,
        updatedAt:t
      };
      await writeJob(j);
      out.push(j);
    }
    return out;
  };

  const applyMock=async(job:PublishingJob,item:ContentItem,r:Awaited<ReturnType<typeof publisherService.publishPlatformJob>>)=>{
    const ps={...item.platformStatus,[job.platform]:r.success?'PUBLISHED':'FAILED'};
    const st=globalStatus(ps,item.platforms,r.success?'PUBLISHED':'FAILED');
    await writeJob({
      ...job,
      status:r.success?'PUBLISHED':'FAILED',
      postUrl:r.postUrl,
      errorMessage:r.errorMessage,
      publishedAt:r.success?now():undefined,
      failedAt:r.success?undefined:now(),
      updatedAt:now()
    });
    await updateContentRecord(item.id,{
      platformStatus:ps,
      status:st,
      platformPostUrls:r.postUrl?{...(item.platformPostUrls||{}),[job.platform]:r.postUrl}:item.platformPostUrls,
      platformErrors:r.errorMessage?{...(item.platformErrors||{}),[job.platform]:r.errorMessage}:item.platformErrors
    });
  };

  const runMock=async(job:PublishingJob,item:ContentItem)=>{
    let ci=item;
    let cj=job;

    const progress=async(e:Omit<PublishingEvent,'id'>)=>{
      await writeEvent(e);
      const ps={...ci.platformStatus,[job.platform]:e.status};
      const st=globalStatus(ps,ci.platforms,ci.status);
      ci={...ci,platformStatus:ps,status:st};
      cj={...cj,status:e.status,updatedAt:now()};
      await updateContentRecord(ci.id,{platformStatus:ps,status:st});
      await writeJob(cj);
    };

    const claimed={...job,status:'CLAIMED' as const,updatedAt:now()};
    await writeJob(claimed);
    cj=claimed;
    const r=await publisherService.getMockAdapter().publishJob(cj,ci,progress);
    await applyMock(cj,ci,r);
  };

  const createContent=async(data:{brandId:string;title:string;videoUrl:string;mediaStorageKey?:string;caption:string;platforms:Platform[];scheduledAt?:string|null},postNow=false)=>{
    const ps:Record<Platform,PlatformPublishStatus>={
      instagram:data.platforms.includes('instagram')?'QUEUED':'IDLE',
      tiktok:data.platforms.includes('tiktok')?'QUEUED':'IDLE',
      youtube:data.platforms.includes('youtube')?'QUEUED':'IDLE'
    };
    const t=now();
    const item:ContentItem={
      id:'cnt_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),
      organizationId:ORG,
      brandId:data.brandId,
      title:data.title.trim(),
      videoUrl:data.videoUrl,
      mediaStorageKey:data.mediaStorageKey,
      caption:data.caption,
      platforms:data.platforms,
      scheduledAt:data.scheduledAt||null,
      status:postNow?'QUEUED':data.scheduledAt?'SCHEDULED':'DRAFT',
      platformStatus:ps,
      platformPostUrls:{},
      platformErrors:{},
      createdAt:t,
      updatedAt:t,
      source:'manual'
    };

    if(cloudReady)await persist('content',item.id,item);
    else setContentList(x=>[item,...x]);

    if(postNow||data.scheduledAt){
      const js=await createJobs(item,data.platforms,data.scheduledAt||null);
      if(postNow&&publisherMode==='mock')for(const j of js)await runMock(j,item);
    }
    return item;
  };

  const updateContent=async(id:string,u:Partial<ContentItem>)=>updateContentRecord(id,u);

  const deleteContent=async(id:string)=>{
    if(cloudReady){
      const js=await getDocs(query(collection(db,'publishing_jobs'),where('organizationId','==',ORG),where('contentId','==',id)));
      const es=await getDocs(query(collection(db,'publishing_events'),where('organizationId','==',ORG),where('contentId','==',id)));
      await Promise.all([
        deleteDoc(doc(db,'content',id)),
        ...js.docs.map(d=>deleteDoc(d.ref)),
        ...es.docs.map(d=>deleteDoc(d.ref))
      ]);
    }else{
      setContentList(x=>x.filter(i=>i.id!==id));
      setJobs(x=>x.filter(i=>i.contentId!==id));
      setEvents(x=>x.filter(i=>i.contentId!==id));
    }
    if(selectedContentItem?.id===id)setSelectedContentItem(null);
  };

  const scheduleContent=async(id:string,date:string)=>{
    const item=contentList.find(i=>i.id===id);
    if(!item)return;

    const scheduledAt=new Date(date).toISOString();
    const ps={...item.platformStatus};
    item.platforms.forEach(p=>ps[p]='QUEUED');
    await updateContentRecord(id,{scheduledAt,status:'SCHEDULED',platformStatus:ps});

    const ex=jobs.filter(j=>j.contentId===id&&!['PUBLISHED','FAILED_PERMANENT'].includes(j.status));
    if(ex.length){
      for(const j of ex)await writeJob({...j,status:'QUEUED',scheduledAt,readyAt:scheduledAt,updatedAt:now()});
    }else{
      await createJobs({...item,scheduledAt,platformStatus:ps},item.platforms,scheduledAt);
    }
  };

  const publishNow=async(id:string,specific?:Platform[])=>{
    const item=contentList.find(i=>i.id===id);
    if(!item)return;

    const target=specific?.length?specific:item.platforms;
    const ps={...item.platformStatus};
    target.forEach(p=>ps[p]='QUEUED');
    const queued={...item,status:'QUEUED' as const,platformStatus:ps,scheduledAt:null};

    await updateContentRecord(id,{status:'QUEUED',platformStatus:ps,scheduledAt:null});
    const js=await createJobs(queued,target,null);
    if(publisherMode==='mock')for(const j of js)await runMock(j,queued);
  };

  const retryPublish=async(id:string,p?:Platform)=>{
    const item=contentList.find(i=>i.id===id);
    if(!item)return;

    const target=p?[p]:item.platforms.filter(x=>['FAILED','RETRY_PENDING','FAILED_PERMANENT'].includes(item.platformStatus[x]));
    if(!target.length)return;

    const ps={...item.platformStatus};
    target.forEach(x=>ps[x]='QUEUED');
    await updateContentRecord(id,{status:'QUEUED',platformStatus:ps});

    for(const platform of target){
      const ex=jobs.find(j=>j.contentId===id&&j.platform===platform&&['FAILED','RETRY_PENDING','FAILED_PERMANENT'].includes(j.status));
      const j=ex
        ?{...ex,status:'QUEUED' as const,readyAt:now(),scheduledAt:null,retryCount:(ex.retryCount||0)+1,errorMessage:undefined,failedAt:undefined,updatedAt:now()}
        :(await createJobs({...item,platformStatus:ps},[platform],null))[0];

      await writeJob(j);
      if(publisherMode==='mock')await runMock(j,{...item,status:'QUEUED',platformStatus:ps});
    }
  };

  const importCsvBatch=async(rows:Array<{brand:string;title:string;video_url:string;caption:string;instagram?:boolean;tiktok?:boolean;youtube?:boolean;scheduled_at?:string}>)=>{
    const errors:string[]=[];
    let imported=0;

    for(let i=0;i<rows.length;i++){
      const r=rows[i];

      if(!r.title?.trim()){
        errors.push('Row '+(i+1)+': Title is required.');
        continue;
      }
      if(!r.video_url?.trim()){
        errors.push('Row '+(i+1)+': Video URL is required.');
        continue;
      }

      let b=brands.find(x=>x.name.toLowerCase()===r.brand?.toLowerCase()||x.code.toLowerCase()===r.brand?.toLowerCase());
      if(!b)b=await createBrand({
        name:r.brand?.trim()||'Imported Brand',
        code:(r.brand?.trim()||'IMPR').slice(0,4).toUpperCase(),
        color:'#E65100'
      });

      const ps:Platform[]=[];
      if(r.instagram)ps.push('instagram');
      if(r.tiktok)ps.push('tiktok');
      if(r.youtube)ps.push('youtube');
      if(!ps.length)ps.push('instagram','tiktok');

      try{
        await createContent({
          brandId:b.id,
          title:r.title.trim(),
          videoUrl:r.video_url.trim(),
          caption:r.caption||'',
          platforms:ps,
          scheduledAt:r.scheduled_at?new Date(r.scheduled_at).toISOString():null
        },false);
        imported++;
      }catch(e:any){
        errors.push('Row '+(i+1)+': '+(e?.message||'Import failed.'));
      }
    }
    return{imported,errors};
  };

  const value=useMemo<AppContextType>(()=>({
    user,
    authLoading,
    signInGoogle:async()=>{
      setAuthLoading(true);
      try{await signInWithPopup(auth,googleProvider)}finally{setAuthLoading(false)}
    },
    signOut:async()=>{
      await fbSignOut(auth).catch(()=>undefined);
      setCloudReady(false);
      setUser(null);
    },
    loginAsDemoOperator:()=>{
      void signInAnonymously(auth).catch(()=>setUser(DEMO));
    },
    brands,
    selectedBrandId,
    setSelectedBrandId,
    createBrand,
    accounts,
    addSocialAccount,
    contentList,
    selectedContentItem,
    setSelectedContentItem,
    createContent,
    updateContent,
    deleteContent,
    scheduleContent,
    publishNow,
    retryPublish,
    jobs,
    events,
    publisherMode,
    setPublisherMode,
    isFailureSimulated,
    toggleSimulatedFailure,
    importCsvBatch
  }),[user,authLoading,cloudReady,brands,selectedBrandId,accounts,contentList,selectedContentItem,jobs,events,publisherMode,simulatedFailures]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useApp=()=>{
  const c=useContext(Ctx);
  if(!c)throw new Error('useApp must be used within AppProvider');
  return c;
};
