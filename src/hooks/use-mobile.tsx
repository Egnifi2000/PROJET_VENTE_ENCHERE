import * as React from "react";

/*
  Définition du breakpoint mobile.
  Ici 768px correspond généralement à la limite utilisée dans beaucoup de frameworks
  (comme Tailwind ou Bootstrap) pour distinguer mobile et tablette/desktop.
*/
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {

  /*
    Création d'un état React pour savoir si l'utilisateur est sur mobile.
    
    - isMobile : valeur actuelle (true / false / undefined au début)
    - setIsMobile : fonction permettant de mettre à jour cette valeur
    
    undefined au départ car on ne connaît pas encore la taille de l'écran
    tant que le composant n'est pas monté dans le navigateur.
  */
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  /*
    useEffect est exécuté après le montage du composant dans le navigateur.
    Il sert ici à :
      - détecter la taille de l'écran
      - écouter les changements de taille (resize)
      - mettre à jour l'état isMobile
  */
  React.useEffect(() => {

    /*
      matchMedia permet de créer une "media query" JavaScript
      équivalente à celle utilisée en CSS.
      
      Ici on surveille les écrans plus petits que 767px.
    */
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    /*
      Fonction déclenchée lorsqu'il y a un changement de taille d'écran.
      Elle met à jour la valeur de isMobile.
    */
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    /*
      Ajout d'un écouteur d'événement sur la media query.
      Dès que la taille de l'écran change, la fonction onChange est appelée.
    */
    mql.addEventListener("change", onChange);

    /*
      Vérification initiale de la taille de l'écran
      lorsque le composant est chargé.
    */
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    /*
      Fonction de nettoyage exécutée lorsque le composant est démonté.
      Elle supprime l'écouteur pour éviter les fuites mémoire.
    */
    return () => mql.removeEventListener("change", onChange);

  }, []);

  /*
    Retourne true ou false.
    
    !! permet de convertir :
      undefined -> false
      true -> true
      false -> false
    
    Cela garantit que la fonction retourne toujours un booléen.
  */
  return !!isMobile;
}