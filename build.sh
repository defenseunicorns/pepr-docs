here=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
me="$(basename ${BASH_SOURCE[0]})"

function help() {
  cat <<- EOH

		$me <docs dir> <core dir> <current release>

		Example:
		  ./$me ./docs ./core v0.18.0

	EOH
}

docs_dir="$1" ; shift 1
if [ -z "$docs_dir" ] ; then help ; echo "Required: <docs dir>"$'\n' ; exit 1 ; fi
docs_dir=$( realpath "$docs_dir" )

core_dir="$1" ; shift 1
if [ -z "$core_dir" ] ; then help ; echo "Required: <core dir>"$'\n' ; exit 1 ; fi
core_dir=$( realpath "$core_dir" )

curr_rel="$1" ; shift 1
if [ -z "$curr_rel" ] ; then help ; echo "Required: <current release>"$'\n' ; exit 1 ; fi


echo "  Docs repo path: \"$docs_dir\""
echo "  Core repo path: \"$core_dir\""
echo "  Core release:   \"$curr_rel\""