here=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
me="$(basename ${BASH_SOURCE[0]})"

function help() {
  cat <<- EOH

		$me <docs repo> <core repo>

	EOH
}

docs_repo="$1" ; shift 1
if [ -z "$docs_repo" ] ; then help ; echo "Required: <docs repo>"$'\n' ; exit 1 ; fi
docs_repo=$( realpath "$docs_repo" )

core_repo="$1" ; shift 1
if [ -z "$core_repo" ] ; then help ; echo "Required: <core repo>"$'\n' ; exit 1 ; fi
core_repo=$( realpath "$core_repo" )


echo "  Docs repo path: \"$docs_repo\""
echo "  Core repo path: \"$core_repo\""