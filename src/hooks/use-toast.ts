import * as React from "react";

/*
  Importation des types utilisés pour le composant Toast.
  - ToastActionElement : type pour les actions possibles dans un toast (bouton par exemple)
  - ToastProps : propriétés du composant Toast.
*/
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

/*
  Nombre maximum de notifications affichées simultanément.
  Ici : une seule notification à la fois.
*/
const TOAST_LIMIT = 1;

/*
  Délai avant suppression complète du toast (en millisecondes).
  La valeur est très grande ici (1 000 000 ms ≈ 16 minutes).
*/
const TOAST_REMOVE_DELAY = 1000000;

/*
  Type représentant un toast enrichi.
  On ajoute certaines propriétés en plus de celles de ToastProps.
*/
type ToasterToast = ToastProps & {
  id: string;                     // Identifiant unique du toast
  title?: React.ReactNode;        // Titre du toast
  description?: React.ReactNode;  // Description du toast
  action?: ToastActionElement;    // Action possible (bouton par exemple)
};

/*
  Définition des types d’actions possibles pour gérer les toasts.
  Cela sert au reducer pour savoir quelle action appliquer.
*/
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",         // Ajouter un toast
  UPDATE_TOAST: "UPDATE_TOAST",   // Modifier un toast existant
  DISMISS_TOAST: "DISMISS_TOAST", // Fermer un toast
  REMOVE_TOAST: "REMOVE_TOAST",   // Supprimer un toast du state
} as const;

/*
  Compteur global utilisé pour générer des identifiants uniques.
*/
let count = 0;

/*
  Génère un identifiant unique pour chaque toast.
*/
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

/*
  Type représentant les types d'actions possibles.
*/
type ActionType = typeof actionTypes;

/*
  Définition des actions possibles envoyées au reducer.
*/
type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

/*
  Structure de l'état global contenant les notifications.
*/
interface State {
  toasts: ToasterToast[];
}

/*
  Map permettant de stocker les timers de suppression des toasts.
  Clé : id du toast
  Valeur : timer setTimeout
*/
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/*
  Ajoute un toast dans une file de suppression automatique.
*/
const addToRemoveQueue = (toastId: string) => {

  // Si un timer existe déjà pour ce toast, on ne fait rien
  if (toastTimeouts.has(toastId)) {
    return;
  }

  /*
    Création d'un timer qui supprimera le toast après un certain délai.
  */
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);

    // Dispatch de l'action REMOVE_TOAST
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });

  }, TOAST_REMOVE_DELAY);

  // Enregistrement du timer
  toastTimeouts.set(toastId, timeout);
};

/*
  Reducer principal qui gère toutes les actions liées aux toasts.
*/
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {

    /*
      Ajout d'un toast au début de la liste.
      On limite ensuite le nombre de toasts affichés.
    */
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    /*
      Mise à jour d’un toast existant.
    */
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          (t.id === action.toast.id ? { ...t, ...action.toast } : t)
        ),
      };

    /*
      Fermeture d’un toast (mais pas suppression immédiate).
    */
    case "DISMISS_TOAST": {
      const { toastId } = action;

      /*
        Effet secondaire : ajout du toast dans la file de suppression.
      */
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      /*
        Mise à jour de l'état : on ferme visuellement le toast.
      */
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }

    /*
      Suppression définitive du toast du state.
    */
    case "REMOVE_TOAST":

      // Suppression de tous les toasts
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }

      // Suppression d’un toast spécifique
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

/*
  Liste des listeners qui seront notifiés lors des changements d'état.
*/
const listeners: Array<(state: State) => void> = [];

/*
  Etat global en mémoire utilisé par le système de toast.
*/
let memoryState: State = { toasts: [] };

/*
  Fonction dispatch qui applique une action au reducer
  et notifie tous les listeners.
*/
function dispatch(action: Action) {

  // Mise à jour du state global
  memoryState = reducer(memoryState, action);

  // Notification des composants abonnés
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

/*
  Type pour créer un toast sans fournir l'id (généré automatiquement).
*/
type Toast = Omit<ToasterToast, "id">;

/*
  Fonction principale permettant de créer un toast.
*/
function toast({ ...props }: Toast) {

  // Génération de l'id du toast
  const id = genId();

  /*
    Fonction permettant de mettre à jour ce toast.
  */
  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });

  /*
    Fonction permettant de fermer ce toast.
  */
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  /*
    Dispatch de l'action d'ajout du toast.
  */
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,

      /*
        Callback appelé lorsque le toast est fermé.
      */
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  /*
    Retourne des fonctions pour manipuler ce toast.
  */
  return {
    id: id,
    dismiss,
    update,
  };
}

/*
  Hook React permettant d'utiliser les toasts dans un composant.
*/
function useToast() {

  /*
    Etat local synchronisé avec l'état global des toasts.
  */
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {

    // Ajout du listener
    listeners.push(setState);

    // Nettoyage lors du démontage du composant
    return () => {
      const index = listeners.indexOf(setState);

      if (index > -1) {
        listeners.splice(index, 1);
      }
    };

  }, [state]);

  /*
    Valeurs et fonctions exposées par le hook.
  */
  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

/*
  Export du hook et de la fonction toast
  pour être utilisés dans l'application.
*/
export { useToast, toast };