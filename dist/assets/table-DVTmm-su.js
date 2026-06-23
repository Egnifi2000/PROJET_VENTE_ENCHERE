import{n as e}from"./rolldown-runtime-Bh1tDfsg.js";import{n as t,t as n}from"./jsx-runtime-72kFbn5o.js";import{a as r,s as i}from"./auction-CkWL7pAc.js";import{a}from"./tslib.es6-Cgo96Pn3.js";import{r as o}from"./index-ByxEK-79.js";function s(){return i({queryKey:[`admin-articles`],queryFn:async()=>{r();let{data:e,error:t}=await o.from(`articles`).select(`
          *,
          article_images(image_url),
          auctions:auctions!article_id(
            id,
            status,
            start_date,
            end_date
          )
        `).order(`created_at`,{ascending:!1});if(t)throw t;return e}})}function c(){return i({queryKey:[`admin-users`],queryFn:async()=>{let{data:e,error:t}=await o.from(`profiles`).select(`
          *,
          user_roles(role)
        `).order(`created_at`,{ascending:!1});if(t)throw t;return e}})}function l(){return i({queryKey:[`admin-auctions`],queryFn:async()=>{r();let{data:e,error:t}=await o.from(`auctions`).select(`
          *,
          articles(*, article_images(image_url)),
          bids(
            *,
            profiles:user_id(
              name,
              email,
              matricule
            )
          )
        `).order(`start_date`,{ascending:!1});if(t)throw console.error(t),t;return e}})}var u=e(t(),1),d=n(),f=u.forwardRef(({className:e,...t},n)=>(0,d.jsx)(`div`,{className:`relative w-full overflow-auto`,children:(0,d.jsx)(`table`,{ref:n,className:a(`w-full caption-bottom text-sm`,e),...t})}));f.displayName=`Table`;var p=u.forwardRef(({className:e,...t},n)=>(0,d.jsx)(`thead`,{ref:n,className:a(`[&_tr]:border-b`,e),...t}));p.displayName=`TableHeader`;var m=u.forwardRef(({className:e,...t},n)=>(0,d.jsx)(`tbody`,{ref:n,className:a(`[&_tr:last-child]:border-0`,e),...t}));m.displayName=`TableBody`;var h=u.forwardRef(({className:e,...t},n)=>(0,d.jsx)(`tfoot`,{ref:n,className:a(`border-t bg-muted/50 font-medium [&>tr]:last:border-b-0`,e),...t}));h.displayName=`TableFooter`;var g=u.forwardRef(({className:e,...t},n)=>(0,d.jsx)(`tr`,{ref:n,className:a(`border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50`,e),...t}));g.displayName=`TableRow`;var _=u.forwardRef(({className:e,...t},n)=>(0,d.jsx)(`th`,{ref:n,className:a(`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0`,e),...t}));_.displayName=`TableHead`;var v=u.forwardRef(({className:e,...t},n)=>(0,d.jsx)(`td`,{ref:n,className:a(`p-4 align-middle [&:has([role=checkbox])]:pr-0`,e),...t}));v.displayName=`TableCell`;var y=u.forwardRef(({className:e,...t},n)=>(0,d.jsx)(`caption`,{ref:n,className:a(`mt-4 text-sm text-muted-foreground`,e),...t}));y.displayName=`TableCaption`;export{p as a,l as c,_ as i,c as l,m as n,g as o,v as r,s,f as t};