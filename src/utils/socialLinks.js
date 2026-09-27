export function generateSocialAction(platform, id) {
  switch (platform) {
    case 'steam':
      return { type: 'deep-link', value: `steam://friends/add/${id}`,                        label: 'In Steam adden'       }
    case 'epic':
      return { type: 'copy',      value: id,                                                  label: 'Epic-ID kopieren'     }
    case 'psn':
      return { type: 'deep-link', value: `https://psnprofiles.com/${id}`,                     label: 'PSN-Profil öffnen'    }
    case 'xbox':
      return { type: 'deep-link', value: `ms-xbox:///?screenName=${encodeURIComponent(id)}`, label: 'Xbox adden'           }
    case 'nintendo':
      return { type: 'copy',      value: id,                                                  label: 'Friend-Code kopieren' }
    default:
      return { type: 'copy',      value: id,                                                  label: 'ID kopieren'          }
  }
}
