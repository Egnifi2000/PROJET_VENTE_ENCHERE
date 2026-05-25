import{r as t,j as s,y as o,g as i,s as l}from"./index-DCoiJBG4.js";import{u as d}from"./useQuery-CKD4ZynK.js";const n=t.forwardRef(({className:a,...e},r)=>s.jsx("div",{className:"relative w-full overflow-auto",children:s.jsx("table",{ref:r,className:o("w-full caption-bottom text-sm",a),...e})}));n.displayName="Table";const c=t.forwardRef(({className:a,...e},r)=>s.jsx("thead",{ref:r,className:o("[&_tr]:border-b",a),...e}));c.displayName="TableHeader";const m=t.forwardRef(({className:a,...e},r)=>s.jsx("tbody",{ref:r,className:o("[&_tr:last-child]:border-0",a),...e}));m.displayName="TableBody";const u=t.forwardRef(({className:a,...e},r)=>s.jsx("tfoot",{ref:r,className:o("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",a),...e}));u.displayName="TableFooter";const f=t.forwardRef(({className:a,...e},r)=>s.jsx("tr",{ref:r,className:o("border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50",a),...e}));f.displayName="TableRow";const b=t.forwardRef(({className:a,...e},r)=>s.jsx("th",{ref:r,className:o("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",a),...e}));b.displayName="TableHead";const y=t.forwardRef(({className:a,...e},r)=>s.jsx("td",{ref:r,className:o("p-4 align-middle [&:has([role=checkbox])]:pr-0",a),...e}));y.displayName="TableCell";const p=t.forwardRef(({className:a,...e},r)=>s.jsx("caption",{ref:r,className:o("mt-4 text-sm text-muted-foreground",a),...e}));p.displayName="TableCaption";function N(){return d({queryKey:["admin-articles"],queryFn:async()=>{await i();const{data:a,error:e}=await l.from("articles").select(`
          *,
          article_images(image_url),
          auctions:auctions!article_id(
            id,
            status,
            start_date,
            end_date
          )
        `).order("created_at",{ascending:!1});if(e)throw e;return a}})}function T(){return d({queryKey:["admin-users"],queryFn:async()=>{const{data:a,error:e}=await l.from("profiles").select(`
          *,
          user_roles(role)
        `).order("created_at",{ascending:!1});if(e)throw e;return a}})}function g(){return d({queryKey:["admin-auctions"],queryFn:async()=>{await i();const{data:a,error:e}=await l.from("auctions").select(`
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
        `).order("start_date",{ascending:!1});if(e)throw console.error(e),e;return a}})}export{n as T,c as a,f as b,b as c,m as d,y as e,T as f,g,N as u};
